from fastapi import FastAPI, APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone
import httpx
from requests_oauthlib import OAuth1
import requests
import pandas as pd
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Magento Price Manager API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic Models
class MagentoConfig(BaseModel):
    magento_url: str
    consumer_key: str
    consumer_secret: str
    access_token: str
    access_token_secret: str

class StoreView(BaseModel):
    id: int
    code: str
    name: str
    website_id: int
    store_group_id: int

class PriceData(BaseModel):
    store_id: int
    base_price: float
    special_price: Optional[float] = None
    special_price_from: Optional[str] = None
    special_price_to: Optional[str] = None

class Product(BaseModel):
    id: int
    sku: str
    name: str
    image_url: Optional[str] = None
    prices: List[PriceData] = []

class PriceUpdate(BaseModel):
    sku: str
    store_id: int
    base_price: Optional[float] = None
    special_price: Optional[float] = None
    special_price_from: Optional[str] = None
    special_price_to: Optional[str] = None

class ConfigSave(BaseModel):
    magento_url: str
    consumer_key: str
    consumer_secret: str
    access_token: str
    access_token_secret: str

class StoreVatRate(BaseModel):
    store_id: int
    store_name: str
    vat_rate: float  # Percentuale IVA (es: 22 per 22%)

class VatRatesUpdate(BaseModel):
    vat_rates: List[StoreVatRate]

class BulkPriceUpdate(BaseModel):
    sku: str
    store_code: str
    base_price: Optional[float] = None
    special_price: Optional[float] = None
    special_price_from: Optional[str] = None
    special_price_to: Optional[str] = None

# Helper function to make Magento API calls with OAuth 1.0a
def magento_request_sync(
    magento_url: str,
    consumer_key: str,
    consumer_secret: str,
    access_token: str,
    access_token_secret: str,
    method: str,
    endpoint: str,
    data: dict = None,
    params: dict = None
) -> dict:
    """Make OAuth 1.0a authenticated request to Magento REST API"""
    url = f"{magento_url.rstrip('/')}/rest/V1{endpoint}"
    
    oauth = OAuth1(
        consumer_key,
        client_secret=consumer_secret,
        resource_owner_key=access_token,
        resource_owner_secret=access_token_secret,
        signature_method='HMAC-SHA256'
    )
    
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        if method == "GET":
            response = requests.get(url, auth=oauth, headers=headers, params=params, timeout=30)
        elif method == "POST":
            response = requests.post(url, auth=oauth, headers=headers, json=data, timeout=30)
        elif method == "PUT":
            response = requests.put(url, auth=oauth, headers=headers, json=data, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Credenziali OAuth non valide")
        elif response.status_code == 404:
            raise HTTPException(status_code=404, detail="Risorsa non trovata")
        elif response.status_code >= 400:
            logger.error(f"Magento API error: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Errore Magento: {response.text}")
        
        return response.json()
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Timeout connessione a Magento")
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Errore connessione: {str(e)}")

async def magento_request(config: MagentoConfig, method: str, endpoint: str, data: dict = None, params: dict = None) -> dict:
    """Async wrapper for OAuth request"""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        lambda: magento_request_sync(
            config.magento_url,
            config.consumer_key,
            config.consumer_secret,
            config.access_token,
            config.access_token_secret,
            method,
            endpoint,
            data,
            params
        )
    )

# Routes
@api_router.get("/")
async def root():
    return {"message": "Magento Price Manager API", "status": "running"}

@api_router.post("/test-connection")
async def test_connection(config: MagentoConfig):
    """Test connection to Magento API"""
    try:
        result = await magento_request(config, "GET", "/store/storeViews")
        return {"success": True, "message": "Connessione riuscita", "stores_count": len(result)}
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/store-views", response_model=List[StoreView])
async def get_store_views(config: MagentoConfig):
    """Get all store views from Magento"""
    try:
        result = await magento_request(config, "GET", "/store/storeViews")
        
        store_views = []
        for sv in result:
            store_views.append(StoreView(
                id=sv.get("id", 0),
                code=sv.get("code", ""),
                name=sv.get("name", ""),
                website_id=sv.get("website_id", 0),
                store_group_id=sv.get("store_group_id", 0)
            ))
        
        return store_views
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error fetching store views: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/products")
async def get_products(
    config: MagentoConfig,
    store_id: int = Query(0, description="Store view ID"),
    page: int = Query(1, description="Page number"),
    page_size: int = Query(20, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by SKU or name")
):
    """Get products with pricing information"""
    try:
        # Build search criteria
        params = {
            "searchCriteria[pageSize]": page_size,
            "searchCriteria[currentPage]": page,
        }
        
        if search:
            params["searchCriteria[filter_groups][0][filters][0][field]"] = "sku"
            params["searchCriteria[filter_groups][0][filters][0][value]"] = f"%{search}%"
            params["searchCriteria[filter_groups][0][filters][0][condition_type]"] = "like"
            params["searchCriteria[filter_groups][0][filters][1][field]"] = "name"
            params["searchCriteria[filter_groups][0][filters][1][value]"] = f"%{search}%"
            params["searchCriteria[filter_groups][0][filters][1][condition_type]"] = "like"
        
        # Fetch products
        products_result = await magento_request(config, "GET", "/products", params=params)
        
        products = []
        items = products_result.get("items", [])
        
        for item in items:
            sku = item.get("sku", "")
            
            # Get base price from custom attributes
            base_price = item.get("price", 0)
            special_price = None
            special_from = None
            special_to = None
            image_url = None
            
            # Extract custom attributes
            custom_attrs = item.get("custom_attributes", [])
            for attr in custom_attrs:
                attr_code = attr.get("attribute_code", "")
                attr_value = attr.get("value")
                
                if attr_code == "special_price" and attr_value:
                    try:
                        special_price = float(attr_value)
                    except:
                        pass
                elif attr_code == "special_from_date":
                    special_from = attr_value
                elif attr_code == "special_to_date":
                    special_to = attr_value
                elif attr_code == "image" and attr_value:
                    image_url = f"{config.magento_url.rstrip('/')}/media/catalog/product{attr_value}"
            
            products.append({
                "id": item.get("id", 0),
                "sku": sku,
                "name": item.get("name", ""),
                "image_url": image_url,
                "prices": [{
                    "store_id": store_id,
                    "base_price": base_price,
                    "special_price": special_price,
                    "special_price_from": special_from,
                    "special_price_to": special_to
                }]
            })
        
        return {
            "items": products,
            "total_count": products_result.get("total_count", 0),
            "page": page,
            "page_size": page_size
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error fetching products: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/update-price")
async def update_product_price(config: MagentoConfig, price_update: PriceUpdate):
    """Update product price for a specific store view"""
    try:
        sku = price_update.sku
        store_id = price_update.store_id
        
        # Build product update payload
        product_data = {
            "product": {
                "sku": sku,
            }
        }
        
        # Update base price if provided
        if price_update.base_price is not None:
            product_data["product"]["price"] = price_update.base_price
        
        # Build custom attributes for special price
        custom_attributes = []
        
        if price_update.special_price is not None:
            custom_attributes.append({
                "attribute_code": "special_price",
                "value": str(price_update.special_price) if price_update.special_price else ""
            })
        
        if price_update.special_price_from:
            custom_attributes.append({
                "attribute_code": "special_from_date",
                "value": price_update.special_price_from
            })
        
        if price_update.special_price_to:
            custom_attributes.append({
                "attribute_code": "special_to_date",
                "value": price_update.special_price_to
            })
        
        if custom_attributes:
            product_data["product"]["custom_attributes"] = custom_attributes
        
        # Get store code for store-specific updates
        store_code = "all"
        if store_id > 0:
            stores = await magento_request(config, "GET", "/store/storeViews")
            for store in stores:
                if store.get("id") == store_id:
                    store_code = store.get("code", "all")
                    break
        
        # Use OAuth for the update request
        oauth = OAuth1(
            config.consumer_key,
            client_secret=config.consumer_secret,
            resource_owner_key=config.access_token,
            resource_owner_secret=config.access_token_secret,
            signature_method='HMAC-SHA256'
        )
        
        url = f"{config.magento_url.rstrip('/')}/rest/{store_code}/V1/products/{sku}"
        headers = {"Content-Type": "application/json"}
        
        response = requests.put(url, auth=oauth, headers=headers, json=product_data, timeout=30)
        
        if response.status_code >= 400:
            logger.error(f"Magento update error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail=f"Errore aggiornamento: {response.text}")
        
        return {"success": True, "message": "Prezzo aggiornato con successo"}
    
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating price: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/update-special-price")
async def update_special_price(config: MagentoConfig, price_update: PriceUpdate):
    """Update special price using Magento 2.2+ special price API"""
    try:
        payload = {
            "prices": [{
                "sku": price_update.sku,
                "price": price_update.special_price,
                "store_id": price_update.store_id,
                "price_from": price_update.special_price_from or "",
                "price_to": price_update.special_price_to or ""
            }]
        }
        
        result = await magento_request(config, "POST", "/products/special-price", data=payload)
        return {"success": True, "message": "Prezzo scontato aggiornato"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating special price: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/delete-special-price")
async def delete_special_price(config: MagentoConfig, sku: str = Query(...), store_id: int = Query(0)):
    """Delete special price for a product"""
    try:
        payload = {
            "prices": [{
                "sku": sku,
                "store_id": store_id,
                "price": 0,
                "price_from": "",
                "price_to": ""
            }]
        }
        
        result = await magento_request(config, "POST", "/products/special-price-delete", data=payload)
        return {"success": True, "message": "Prezzo scontato rimosso"}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting special price: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Save/Load configuration from MongoDB
@api_router.post("/save-config")
async def save_config(config: ConfigSave):
    """Save Magento configuration (encrypted in production)"""
    try:
        await db.magento_config.update_one(
            {"_id": "default"},
            {"$set": {
                "magento_url": config.magento_url,
                "consumer_key": config.consumer_key,
                "consumer_secret": config.consumer_secret,
                "access_token": config.access_token,
                "access_token_secret": config.access_token_secret,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        return {"success": True, "message": "Configurazione salvata"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/load-config")
async def load_config():
    """Load saved Magento configuration"""
    try:
        config = await db.magento_config.find_one({"_id": "default"}, {"_id": 0})
        if config:
            return {"success": True, "config": config}
        return {"success": False, "message": "Nessuna configurazione salvata"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# VAT Rates Management
@api_router.get("/vat-rates")
async def get_vat_rates():
    """Get VAT rates for all stores"""
    try:
        rates = await db.vat_rates.find({}, {"_id": 0}).to_list(100)
        return {"success": True, "vat_rates": rates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/vat-rates")
async def save_vat_rates(data: VatRatesUpdate):
    """Save VAT rates for stores"""
    try:
        # Clear existing rates and insert new ones
        await db.vat_rates.delete_many({})
        if data.vat_rates:
            rates_dicts = [rate.model_dump() for rate in data.vat_rates]
            await db.vat_rates.insert_many(rates_dicts)
        return {"success": True, "message": "Aliquote IVA salvate"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Excel Export
@api_router.post("/export-prices")
async def export_prices(config: MagentoConfig):
    """Export all products prices to Excel"""
    try:
        # Get all store views
        stores = await magento_request(config, "GET", "/store/storeViews")
        
        # Get VAT rates
        vat_rates_cursor = db.vat_rates.find({}, {"_id": 0})
        vat_rates_list = await vat_rates_cursor.to_list(100)
        vat_rates = {rate["store_id"]: rate["vat_rate"] for rate in vat_rates_list}
        
        # Fetch all products (paginated)
        all_products = []
        page = 1
        page_size = 100
        
        while True:
            params = {
                "searchCriteria[pageSize]": page_size,
                "searchCriteria[currentPage]": page,
            }
            result = await magento_request(config, "GET", "/products", params=params)
            items = result.get("items", [])
            
            if not items:
                break
                
            all_products.extend(items)
            
            if len(items) < page_size:
                break
            page += 1
            
            # Safety limit
            if page > 50:
                break
        
        # Build Excel data
        rows = []
        for product in all_products:
            sku = product.get("sku", "")
            name = product.get("name", "")
            base_price = product.get("price", 0)
            
            # Extract special price info
            special_price = None
            special_from = None
            special_to = None
            
            for attr in product.get("custom_attributes", []):
                attr_code = attr.get("attribute_code", "")
                attr_value = attr.get("value")
                if attr_code == "special_price" and attr_value:
                    try:
                        special_price = float(attr_value)
                    except:
                        pass
                elif attr_code == "special_from_date":
                    special_from = attr_value
                elif attr_code == "special_to_date":
                    special_to = attr_value
            
            # Add row for each store
            for store in stores:
                store_id = store.get("id", 0)
                store_code = store.get("code", "")
                store_name = store.get("name", "")
                vat_rate = vat_rates.get(store_id, 0)
                
                # Calculate price with VAT for display
                vat_multiplier = 1 + (vat_rate / 100) if vat_rate > 0 else 1
                base_price_incl_vat = base_price * vat_multiplier if base_price else None
                special_price_incl_vat = special_price * vat_multiplier if special_price else None
                
                rows.append({
                    "SKU": sku,
                    "Nome Prodotto": name,
                    "Store": store_code,
                    "Store Nome": store_name,
                    "Aliquota IVA %": vat_rate,
                    "Prezzo Base (IVA incl.)": round(base_price_incl_vat, 2) if base_price_incl_vat else None,
                    "Prezzo Scontato (IVA incl.)": round(special_price_incl_vat, 2) if special_price_incl_vat else None,
                    "Data Inizio Sconto": special_from,
                    "Data Fine Sconto": special_to,
                })
        
        # Create Excel file
        df = pd.DataFrame(rows)
        output = BytesIO()
        
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Prezzi')
            
            # Auto-adjust column widths
            worksheet = writer.sheets['Prezzi']
            for idx, col in enumerate(df.columns):
                max_len = max(df[col].astype(str).map(len).max(), len(col)) + 2
                worksheet.set_column(idx, idx, min(max_len, 40))
        
        output.seek(0)
        
        filename = f"prezzi_magento_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error exporting prices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Excel Import
@api_router.post("/import-prices")
async def import_prices(
    file: UploadFile = File(...),
    magento_url: str = Query(...),
    consumer_key: str = Query(...),
    consumer_secret: str = Query(...),
    access_token: str = Query(...),
    access_token_secret: str = Query(...)
):
    """Import prices from Excel file"""
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # Validate required columns
        required_cols = ["SKU", "Store"]
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Colonna mancante: {col}")
        
        # Get VAT rates
        vat_rates_cursor = db.vat_rates.find({}, {"_id": 0})
        vat_rates_list = await vat_rates_cursor.to_list(100)
        vat_rates_by_store = {}
        for rate in vat_rates_list:
            vat_rates_by_store[rate.get("store_id")] = rate.get("vat_rate", 0)
        
        # Get store views to map codes to IDs
        config = MagentoConfig(
            magento_url=magento_url,
            consumer_key=consumer_key,
            consumer_secret=consumer_secret,
            access_token=access_token,
            access_token_secret=access_token_secret
        )
        stores = await magento_request(config, "GET", "/store/storeViews")
        store_code_to_id = {s.get("code"): s.get("id") for s in stores}
        
        # Process each row
        results = {"success": 0, "errors": []}
        
        for idx, row in df.iterrows():
            try:
                sku = str(row.get("SKU", "")).strip()
                store_code = str(row.get("Store", "")).strip()
                
                if not sku or not store_code:
                    results["errors"].append(f"Riga {idx + 2}: SKU o Store mancante")
                    continue
                
                store_id = store_code_to_id.get(store_code)
                if store_id is None:
                    results["errors"].append(f"Riga {idx + 2}: Store '{store_code}' non trovato")
                    continue
                
                # Get VAT rate for this store
                vat_rate = vat_rates_by_store.get(store_id, 0)
                vat_divisor = 1 + (vat_rate / 100) if vat_rate > 0 else 1
                
                # Get prices (IVA inclusa from Excel) and convert to IVA esclusa
                base_price_incl = row.get("Prezzo Base (IVA incl.)")
                special_price_incl = row.get("Prezzo Scontato (IVA incl.)")
                special_from = row.get("Data Inizio Sconto")
                special_to = row.get("Data Fine Sconto")
                
                # Convert to net prices (IVA esclusa)
                base_price = None
                if pd.notna(base_price_incl):
                    base_price = round(float(base_price_incl) / vat_divisor, 2)
                
                special_price = None
                if pd.notna(special_price_incl):
                    special_price = round(float(special_price_incl) / vat_divisor, 2)
                
                # Format dates
                special_from_str = None
                special_to_str = None
                if pd.notna(special_from):
                    if isinstance(special_from, datetime):
                        special_from_str = special_from.strftime("%Y-%m-%d")
                    else:
                        special_from_str = str(special_from)[:10]
                
                if pd.notna(special_to):
                    if isinstance(special_to, datetime):
                        special_to_str = special_to.strftime("%Y-%m-%d")
                    else:
                        special_to_str = str(special_to)[:10]
                
                # Build update payload
                if base_price is not None or special_price is not None:
                    product_data = {"product": {"sku": sku}}
                    
                    if base_price is not None:
                        product_data["product"]["price"] = base_price
                    
                    custom_attrs = []
                    if special_price is not None:
                        custom_attrs.append({"attribute_code": "special_price", "value": str(special_price)})
                    if special_from_str:
                        custom_attrs.append({"attribute_code": "special_from_date", "value": special_from_str})
                    if special_to_str:
                        custom_attrs.append({"attribute_code": "special_to_date", "value": special_to_str})
                    
                    if custom_attrs:
                        product_data["product"]["custom_attributes"] = custom_attrs
                    
                    # Make update request
                    oauth = OAuth1(
                        consumer_key,
                        client_secret=consumer_secret,
                        resource_owner_key=access_token,
                        resource_owner_secret=access_token_secret,
                        signature_method='HMAC-SHA256'
                    )
                    
                    url = f"{magento_url.rstrip('/')}/rest/{store_code}/V1/products/{sku}"
                    headers = {"Content-Type": "application/json"}
                    
                    response = requests.put(url, auth=oauth, headers=headers, json=product_data, timeout=30)
                    
                    if response.status_code >= 400:
                        results["errors"].append(f"Riga {idx + 2}: Errore Magento - {response.text[:100]}")
                    else:
                        results["success"] += 1
                else:
                    results["errors"].append(f"Riga {idx + 2}: Nessun prezzo da aggiornare")
                    
            except Exception as e:
                results["errors"].append(f"Riga {idx + 2}: {str(e)}")
        
        return {
            "success": True,
            "message": f"Importazione completata: {results['success']} prodotti aggiornati",
            "updated_count": results["success"],
            "errors": results["errors"][:20]  # Limit errors shown
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error importing prices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Download template Excel
@api_router.get("/download-template")
async def download_template():
    """Download empty Excel template for price import"""
    try:
        # Create template DataFrame
        df = pd.DataFrame(columns=[
            "SKU",
            "Nome Prodotto",
            "Store",
            "Store Nome",
            "Aliquota IVA %",
            "Prezzo Base (IVA incl.)",
            "Prezzo Scontato (IVA incl.)",
            "Data Inizio Sconto",
            "Data Fine Sconto"
        ])
        
        # Add example row
        df.loc[0] = [
            "ESEMPIO-SKU-001",
            "Prodotto Esempio",
            "default",
            "Default Store View",
            22,
            122.00,
            99.00,
            "2025-01-01",
            "2025-12-31"
        ]
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, index=False, sheet_name='Prezzi')
            
            worksheet = writer.sheets['Prezzi']
            for idx, col in enumerate(df.columns):
                worksheet.set_column(idx, idx, 25)
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=template_prezzi.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

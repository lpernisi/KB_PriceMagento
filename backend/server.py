from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import httpx
from requests_oauthlib import OAuth1
import requests

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

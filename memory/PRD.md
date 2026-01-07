# Magento 2 Price Manager - PRD

## Problem Statement
L'utente necessita di una pagina web per gestire i prezzi dei prodotti pubblicati su Magento 2 multistore. Stessi SKU possono avere prezzi diversi per ogni store view.

## Dati Essenziali
- SKU
- Nome prodotto
- Prezzo base
- Prezzo scontato (special price)
- Data inizio sconto
- Data fine sconto
- Link immagine prodotto

## User Personas
- **E-commerce Manager**: Gestisce i prezzi su più store Magento 2
- **Store Administrator**: Aggiorna prezzi promozionali periodicamente

## Core Requirements
1. Form di configurazione per URL Magento e Access Token
2. Dropdown per selezionare lo store view
3. Tabella prodotti con editing inline
4. Modifica prezzi base e scontati per store
5. Modifica date inizio/fine promozione
6. Visualizzazione immagine prodotto

## Architecture
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (per cache configurazione)
- **External**: Magento 2 REST API

## What's Been Implemented (07/01/2025)
- ✅ Form configurazione con validazione URL
- ✅ Salvataggio credenziali in MongoDB
- ✅ API proxy per Magento 2 REST API
- ✅ Dashboard con store selector dropdown
- ✅ Tabella prodotti con dati SKU, nome, prezzi, date, immagine
- ✅ Editing inline per prezzi
- ✅ DatePicker per date promozione
- ✅ Status badge (Attivo/Programmato/Scaduto)
- ✅ Paginazione e ricerca prodotti
- ✅ Gestione errori e toast notifications

## Backlog
### P0 (Critical)
- Nessuno

### P1 (High)
- Bulk update prezzi per più prodotti
- Export/Import CSV prezzi

### P2 (Medium)
- Storico modifiche prezzi
- Confronto prezzi tra store
- Filtri avanzati (per categoria, status)

## Next Action Items
1. Test con installazione Magento 2 reale
2. Gestione tier prices
3. Supporto per prezzi per quantità

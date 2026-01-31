#!/usr/bin/env python3
"""
Firebase Model Injector Script

This script reads all *_model.json files from the project and pushes
their data to Firebase Firestore following the NoSQL hierarchy:
  project-{domain_id}/
  └── {page_subcollection}/
      └── main (document)

Usage:
  python scripts/firebase-model-injector.py --domain-id <domain_id>
  
Requirements:
  pip install firebase-admin python-dotenv

Environment Variables (from .env):
  FIREBASE_UUID                           # User ID for Firebase auth
  NEXT_PUBLIC_FIREBASE_API_KEY
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  NEXT_PUBLIC_FIREBASE_PROJECT_ID
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  NEXT_PUBLIC_FIREBASE_APP_ID
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

# Try to import firebase-admin
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("ERROR: firebase-admin not installed. Run: pip install firebase-admin")
    sys.exit(1)

# Try to import dotenv
try:
    from dotenv import load_dotenv
except ImportError:
    print("ERROR: python-dotenv not installed. Run: pip install python-dotenv")
    sys.exit(1)

# Try to import dateutil
try:
    from dateutil import parser as date_parser
except ImportError:
    print("ERROR: python-dateutil not installed. Run: pip install python-dateutil")
    sys.exit(1)


# ============================================
# CONFIGURATION
# ============================================

# Pattern for model files: [1-9][0-9]*_model.json
MODEL_FILE_PATTERN = re.compile(r'^[1-9]\d*_model\.json$')

# Project root (script location)
SCRIPT_DIR = Path(__file__).parent.absolute()
PROJECT_ROOT = SCRIPT_DIR.parent


# ============================================
# TYPE DEFINITIONS
# ============================================

class ParsedModelData:
    """Container for parsed model file data"""
    def __init__(self):
        self.data: Dict[str, Any] = {}
        self.collection_name: str = ""
        self.document_id: str = "main"
        self.nested_collections: Dict[str, Any] = {}
        self.shared_data: Dict[str, Dict[str, Any]] = {}  # entity -> {collection, fields, data}


# ============================================
# MODEL FILE PARSER (SUPER SIMPLE!)
# ============================================

def find_model_files(app_dir: Path) -> List[Path]:
    """Find all *_model.json files in the app directory"""
    model_files = []
    
    for file_path in app_dir.rglob("*_model.json"):
        if MODEL_FILE_PATTERN.match(file_path.name):
            model_files.append(file_path)
            print(f"  Found: {file_path.relative_to(PROJECT_ROOT)}")
    
    return model_files


def extract_collection_name_from_path(model_path: Path, app_dir: Path) -> str:
    """
    Extract collection name from file path.
    e.g., app/dashboard/analytics/1_model.json -> analytics
    e.g., app/dashboard/1_model.json -> dashboard
    """
    relative_path = model_path.relative_to(app_dir)
    parts = list(relative_path.parts[:-1])  # Exclude filename
    
    if not parts:
        return "root"
    
    # Use the last directory as collection name
    collection_name = parts[-1].lower().replace("_", "-")
    return collection_name


def parse_json_model(file_path: Path) -> Dict[str, Any]:
    """
    Parse JSON model file - dead simple!
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def parse_model_file(model_path: Path, app_dir: Path) -> Optional[ParsedModelData]:
    """Parse a model file and extract data for Firebase"""
    print(f"\n  Processing: {model_path.relative_to(PROJECT_ROOT)}")
    
    result = ParsedModelData()
    
    # Get collection name from path (default)
    result.collection_name = extract_collection_name_from_path(model_path, app_dir)
    
    # Parse JSON
    try:
        data = parse_json_model(model_path)
        
        # Check for _metadata in the JSON
        if '_metadata' in data:
            meta = data['_metadata']
            
            # Override collection name if specified
            if 'collectionName' in meta:
                result.collection_name = meta['collectionName']
            
            # Get document ID if specified
            if 'documentId' in meta:
                result.document_id = meta['documentId']
            
            # Get nested collections if specified
            if 'nestedCollections' in meta:
                result.nested_collections = meta['nestedCollections']
            
            # Process shared data configuration
            if 'sharedData' in meta:
                shared_config = meta['sharedData']
                for entity_name, entity_config in shared_config.items():
                    if isinstance(entity_config, dict):
                        shared_collection = entity_config.get('collection', f'_shared/{entity_name}')
                        shared_fields = entity_config.get('fields', [])
                        
                        # Extract shared data from main data object
                        shared_data_obj = {}
                        for field in shared_fields:
                            if field in data:
                                shared_data_obj[field] = data[field]
                                # Remove from main data (will go to page collection)
                                del data[field]
                        
                        # Also check if entity_name is a direct key in data
                        if entity_name in data and isinstance(data[entity_name], dict):
                            # Merge entity object data
                            for key, value in data[entity_name].items():
                                if key in shared_fields or not shared_fields:
                                    shared_data_obj[key] = value
                            del data[entity_name]
                        
                        if shared_data_obj:
                            result.shared_data[entity_name] = {
                                'collection': shared_collection,
                                'fields': shared_fields,
                                'data': shared_data_obj
                            }
                            print(f"    Shared data detected: {entity_name} -> {shared_collection}")
            
            # Remove _metadata from data (it's config, not data)
            del data['_metadata']
        
        result.data = data
        
        print(f"    Collection: {result.collection_name}")
        print(f"    Document: {result.document_id}")
        print(f"    Fields found: {len(result.data)}")
        for key in result.data.keys():
            print(f"      - {key}")
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"    ERROR: Invalid JSON: {e}")
        return None
    except Exception as e:
        print(f"    ERROR: Failed to parse: {e}")
        return None


# ============================================
# FIREBASE OPERATIONS
# ============================================

def get_firebase_uuid(required: bool = True) -> str:
    """Get Firebase UUID from environment"""
    firebase_uuid = os.getenv('FIREBASE_UUID')
    if not firebase_uuid:
        if required:
            print("ERROR: FIREBASE_UUID not set in .env")
            print("  Add FIREBASE_UUID=<your-firebase-user-id> to .env")
            print("  You can find your Firebase user ID in the Firebase Console under Authentication > Users")
            sys.exit(1)
        else:
            # Use a placeholder for dry-run
            return 'dry-run-user-id'
    return firebase_uuid


def init_firebase(project_id: str, dry_run: bool = False) -> firestore.Client:
    """Initialize Firebase Admin SDK with service account credentials"""
    # Check if already initialized
    try:
        app = firebase_admin.get_app()
        return firestore.client(app)
    except ValueError:
        pass
    
    # Get Firebase UUID for auth context (optional for service account)
    firebase_uuid = get_firebase_uuid(required=False)
    auth_override = None
    
    if firebase_uuid and firebase_uuid != 'dry-run-user-id':
        auth_override = {'uid': firebase_uuid}
        print(f"  Firebase UUID: {firebase_uuid[:8]}...{firebase_uuid[-4:]}")
    elif dry_run:
        print(f"  Firebase UUID: (dry-run placeholder)")
    else:
        print(f"  Firebase UUID: (not set - using service account privileges)")
    
    # Initialize with service account or default credentials
    try:
        # Try service account first (credentials.json)
        service_account_path = PROJECT_ROOT / 'credentials.json'
        if service_account_path.exists():
            cred = credentials.Certificate(str(service_account_path))
            init_options = {'projectId': project_id}
            if auth_override:
                init_options['databaseAuthVariableOverride'] = auth_override
            firebase_admin.initialize_app(cred, init_options)
            print(f"  Initialized with service account credentials")
            if auth_override:
                print(f"  Auth override UID: {firebase_uuid}")
        else:
            # Use application default credentials
            init_options = {'projectId': project_id}
            if auth_override:
                init_options['databaseAuthVariableOverride'] = auth_override
            firebase_admin.initialize_app(options=init_options)
            print(f"  Initialized with default credentials")
            if auth_override:
                print(f"  Auth override UID: {firebase_uuid}")
        
        return firestore.client()
    except Exception as e:
        print(f"ERROR: Failed to initialize Firebase: {e}")
        sys.exit(1)


def push_shared_data_to_firestore(
    db: firestore.Client,
    domain_id: str,
    shared_data: Dict[str, Dict[str, Any]],
    dry_run: bool = False
) -> bool:
    """Push shared data to _shared collections"""
    collection_path = f"project-{domain_id}"
    firebase_uuid = os.getenv('FIREBASE_UUID', 'unknown')
    
    for entity_name, entity_info in shared_data.items():
        shared_collection = entity_info['collection']
        shared_data_obj = entity_info['data']
        
        # Parse collection path (e.g., "_shared/customers" -> ["_shared", "customers"])
        collection_parts = shared_collection.split('/')
        
        # Build document reference matching existing pattern
        # For "_shared/customers", create: project-{domain_id}/_shared/customers/main
        # Following the same pattern as: project-{domain_id}/dashboard/main
        if len(collection_parts) == 2:
            # _shared/customers -> project-{domain_id}/_shared/customers/main
            # Match existing pattern: collection().document().document()
            doc_ref = db.collection(collection_path).document(collection_parts[0]).document(collection_parts[1]).document('main')
        else:
            # Fallback: treat as single collection name
            # e.g., "customers" -> project-{domain_id}/customers/main
            doc_ref = db.collection(collection_path).document(shared_collection).document('main')
        
        doc_path = f"{collection_path}/{shared_collection}/main"
        print(f"    Shared collection path: {doc_path}")
        
        if dry_run:
            print(f"    [DRY RUN] Would write {len(shared_data_obj)} fields to shared collection")
            continue
        
        try:
            # Add injection metadata
            data_to_push = {
                **shared_data_obj,
                '_injectedAt': datetime.now(timezone.utc).isoformat(),
                '_injectedBy': firebase_uuid,
                '_source': 'firebase-model-injector.py',
            }
            
            # Push to Firestore (merge to preserve existing data)
            doc_ref.set(data_to_push, merge=True)
            print(f"    [OK] Successfully pushed shared data: {entity_name}")
        except Exception as e:
            print(f"    [ERROR] Failed to push shared data {entity_name}: {e}")
            return False
    
    return True


def push_to_firestore(
    db: firestore.Client,
    domain_id: str,
    model_data: ParsedModelData,
    dry_run: bool = False
) -> bool:
    """Push parsed model data to Firestore"""
    
    # First, push shared data (if any) - this ensures shared collections exist before page collections reference them
    if model_data.shared_data:
        print(f"    Processing {len(model_data.shared_data)} shared data entity/entities...")
        if not push_shared_data_to_firestore(db, domain_id, model_data.shared_data, dry_run):
            return False
    
    # Get Firebase UUID for metadata
    firebase_uuid = os.getenv('FIREBASE_UUID', 'unknown')
    
    # Check if data contains arrays that should be written as individual documents
    # Look for common array field names (clients, assessments, questionnaires, etc.)
    array_fields = []
    single_object_fields = []
    
    for key, value in model_data.data.items():
        if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
            # This is an array of objects - write as individual documents
            array_fields.append(key)
        elif isinstance(value, dict):
            # This is a single object - might be written as a single document
            single_object_fields.append(key)
    
    # If we have array fields, write them to top-level collections
    if array_fields:
        for array_field in array_fields:
            items = model_data.data[array_field]
            
            # Map common field names to collection names
            collection_map = {
                'clients': 'clients',
                'assessments': 'assessments',
                'questionnaires': 'questionnaireTemplates',
                'installations': 'installations',
                'layouts': 'layouts',
                'recentClients': 'clients',  # Dashboard recentClients goes to clients collection
            }
            
            # Use mapped collection name or derive from field name
            collection_name = collection_map.get(array_field, array_field.rstrip('s') if array_field.endswith('s') else array_field)
            
            # Override with metadata collection name if it's explicitly set and different
            # (e.g., if metadata says "clients" but field is "recentClients", use "clients")
            if model_data.collection_name and model_data.collection_name in collection_map.values():
                collection_name = model_data.collection_name
            
            collection_ref = db.collection(collection_name)
            doc_path_base = f"{collection_name}"
            
            print(f"    Writing {len(items)} items to collection: {collection_name}")
            
            if dry_run:
                print(f"    [DRY RUN] Would write {len(items)} documents to {collection_name} collection")
                continue
            
            try:
                for item in items:
                    if isinstance(item, dict):
                        # Use the 'id' field as document ID, or generate one
                        item_id = item.get('id')
                        if not item_id:
                            item_id = collection_ref.document().id
                        
                        # Convert date strings to Firestore Timestamps
                        item_data = item.copy()
                        for date_field in ['createdAt', 'updatedAt', 'conductedDate', 'scheduledDate', 'deliveryDate', 'completionDate']:
                            if date_field in item_data and isinstance(item_data[date_field], str):
                                try:
                                    # Parse ISO 8601 date string
                                    dt = date_parser.parse(item_data[date_field])
                                    if dt.tzinfo is None:
                                        dt = dt.replace(tzinfo=timezone.utc)
                                    # Firestore Python SDK accepts datetime objects directly
                                    item_data[date_field] = dt
                                except Exception as e:
                                    print(f"      Warning: Could not parse date {date_field}: {e}")
                                    pass
                        
                        # Add injection metadata
                        item_data['_injectedAt'] = datetime.now(timezone.utc).isoformat()
                        item_data['_injectedBy'] = firebase_uuid
                        item_data['_source'] = 'firebase-model-injector.py'
                        
                        # Remove 'id' from data (it's the document ID)
                        if 'id' in item_data:
                            del item_data['id']
                        
                        collection_ref.document(str(item_id)).set(item_data)
                
                print(f"    [OK] Successfully pushed {len(items)} documents to {collection_name} collection")
            except Exception as e:
                print(f"    [ERROR] Failed to push {array_field} to {collection_name}: {e}")
                return False
        
        # If there are other fields (like total, page, etc.), we can skip them for now
        # as they're typically computed from the collection
        return True
    
    # If no array fields, treat as a single document (legacy behavior)
    # This handles cases like client-detail with a single client object
    if single_object_fields:
        # For single objects, use the collection name from metadata
        collection_name = model_data.collection_name
        doc_id = model_data.document_id
        
        doc_path = f"{collection_name}/{doc_id}"
        print(f"    Firebase path: {doc_path}")
        
        if dry_run:
            print(f"    [DRY RUN] Would write {len(model_data.data)} fields to {collection_name} collection")
            return True
        
        try:
            doc_ref = db.collection(collection_name).document(doc_id)
            
            # Convert date strings to Firestore Timestamps
            data_to_push = model_data.data.copy()
            for key, value in data_to_push.items():
                if isinstance(value, str) and key in ['createdAt', 'updatedAt', 'conductedDate', 'scheduledDate']:
                    try:
                        dt = date_parser.parse(value)
                        if dt.tzinfo is None:
                            dt = dt.replace(tzinfo=timezone.utc)
                        # Firestore Python SDK accepts datetime objects directly
                        data_to_push[key] = dt
                    except Exception as e:
                        print(f"      Warning: Could not parse date {key}: {e}")
                        pass
            
            # Add injection metadata
            data_to_push['_injectedAt'] = datetime.now(timezone.utc).isoformat()
            data_to_push['_injectedBy'] = firebase_uuid
            data_to_push['_source'] = 'firebase-model-injector.py'
            
            doc_ref.set(data_to_push)
            print(f"    [OK] Successfully pushed to Firestore")
            
            return True
            
        except Exception as e:
            print(f"    [ERROR] Failed to push: {e}")
            return False
    
    # Fallback: write all data as-is to a single document
    collection_name = model_data.collection_name
    doc_id = model_data.document_id
    doc_path = f"{collection_name}/{doc_id}"
    
    print(f"    Firebase path: {doc_path}")
    
    if dry_run:
        print(f"    [DRY RUN] Would write {len(model_data.data)} fields to {collection_name} collection")
        return True
    
    try:
        doc_ref = db.collection(collection_name).document(doc_id)
        
        data_to_push = {
            **model_data.data,
            '_injectedAt': datetime.now(timezone.utc).isoformat(),
            '_injectedBy': firebase_uuid,
            '_source': 'firebase-model-injector.py',
        }
        
        doc_ref.set(data_to_push)
        print(f"    [OK] Successfully pushed to Firestore")
        
        return True
        
    except Exception as e:
        print(f"    [ERROR] Failed to push: {e}")
        return False


# ============================================
# MAIN EXECUTION
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description='Push *_model.json data to Firebase Firestore'
    )
    parser.add_argument(
        '--domain-id',
        required=True,
        help='Domain ID for the project (used in collection name: project-<domain-id>)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Parse files but do not push to Firebase'
    )
    parser.add_argument(
        '--app-dir',
        default='app',
        help='Path to app directory (default: app)'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("Firebase Model Injector (JSON)")
    print("=" * 60)
    
    # Load environment variables
    env_path = PROJECT_ROOT / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[OK] Loaded .env from {env_path}")
    else:
        print(f"Warning: .env file not found at {env_path}")
    
    # Get Firebase project ID
    project_id = os.getenv('NEXT_PUBLIC_FIREBASE_PROJECT_ID')
    if not project_id:
        print("ERROR: NEXT_PUBLIC_FIREBASE_PROJECT_ID not set in .env")
        sys.exit(1)
    
    print(f"[OK] Firebase Project: {project_id}")
    print(f"[OK] Domain ID: {args.domain_id}")
    print(f"[OK] Target Collection: project-{args.domain_id}")
    
    if args.dry_run:
        print("[WARNING] DRY RUN MODE - No data will be pushed")
    
    # Initialize Firebase
    print("\n[1/3] Initializing Firebase...")
    db = init_firebase(project_id, args.dry_run)
    
    # Find model files
    print("\n[2/3] Scanning for model files...")
    app_dir = PROJECT_ROOT / args.app_dir
    if not app_dir.exists():
        print(f"ERROR: App directory not found: {app_dir}")
        sys.exit(1)
    
    model_files = find_model_files(app_dir)
    
    if not model_files:
        print("\nNo model files found matching pattern: [1-9]*_model.json")
        print("Make sure model files exist in the app directory.")
        sys.exit(0)
    
    print(f"\nFound {len(model_files)} model file(s)")
    
    # Process and push each model file
    print("\n[3/3] Processing and pushing model files...")
    success_count = 0
    error_count = 0
    
    for model_path in model_files:
        parsed = parse_model_file(model_path, app_dir)
        
        if parsed:
            if push_to_firestore(db, args.domain_id, parsed, args.dry_run):
                success_count += 1
            else:
                error_count += 1
        else:
            error_count += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Total files processed: {len(model_files)}")
    print(f"Successful: {success_count}")
    print(f"Errors: {error_count}")
    
    if args.dry_run:
        print("\n[WARNING] This was a DRY RUN. No data was pushed to Firebase.")
        print("  Remove --dry-run flag to actually push data.")
    
    sys.exit(0 if error_count == 0 else 1)


if __name__ == '__main__':
    main()

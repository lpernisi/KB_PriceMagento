import requests
import sys
import json
from datetime import datetime

class MagentoAPITester:
    def __init__(self, base_url="https://multi-store-prices.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params, timeout=30)

            success = response.status_code == expected_status
            
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_data": None,
                "error": None
            }
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result["response_data"] = response.json()
                except:
                    result["response_data"] = response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    result["error"] = error_data
                    print(f"   Error: {error_data}")
                except:
                    result["error"] = response.text
                    print(f"   Error: {response.text}")

            self.test_results.append(result)
            return success, result["response_data"] if success else result["error"]

        except Exception as e:
            print(f"❌ Failed - Exception: {str(e)}")
            result = {
                "test_name": name,
                "endpoint": endpoint,
                "method": method,
                "expected_status": expected_status,
                "actual_status": None,
                "success": False,
                "response_data": None,
                "error": str(e)
            }
            self.test_results.append(result)
            return False, str(e)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def test_connection_with_invalid_data(self):
        """Test connection with invalid Magento credentials"""
        return self.run_test(
            "Test Connection - Invalid Data",
            "POST",
            "test-connection",
            400,  # Expecting validation error or connection failure
            data={
                "magento_url": "invalid-url",
                "access_token": "invalid-token"
            }
        )

    def test_connection_with_valid_format(self):
        """Test connection with valid URL format but fake credentials"""
        return self.run_test(
            "Test Connection - Valid Format",
            "POST",
            "test-connection",
            502,  # Expecting connection error since it's fake
            data={
                "magento_url": "https://fake-magento-store.com",
                "access_token": "fake-token-12345"
            }
        )

    def test_store_views_invalid(self):
        """Test store views with invalid credentials"""
        return self.run_test(
            "Store Views - Invalid Credentials",
            "POST",
            "store-views",
            502,  # Expecting connection error
            data={
                "magento_url": "https://fake-magento-store.com",
                "access_token": "fake-token-12345"
            }
        )

    def test_products_invalid(self):
        """Test products endpoint with invalid credentials"""
        return self.run_test(
            "Products - Invalid Credentials",
            "POST",
            "products?store_id=0&page=1&page_size=10",
            502,  # Expecting connection error
            data={
                "magento_url": "https://fake-magento-store.com",
                "access_token": "fake-token-12345"
            }
        )

    def test_update_price_invalid(self):
        """Test price update with invalid credentials"""
        return self.run_test(
            "Update Price - Invalid Credentials",
            "POST",
            "update-price",
            502,  # Expecting connection error
            data={
                "magento_url": "https://fake-magento-store.com",
                "access_token": "fake-token-12345",
                "sku": "TEST-SKU",
                "store_id": 0,
                "base_price": 99.99
            }
        )

    def test_save_config(self):
        """Test saving configuration"""
        return self.run_test(
            "Save Configuration",
            "POST",
            "save-config",
            200,
            data={
                "magento_url": "https://test-store.com",
                "access_token": "test-token"
            }
        )

    def test_load_config(self):
        """Test loading configuration"""
        return self.run_test(
            "Load Configuration",
            "GET",
            "load-config",
            200
        )

    def test_form_validation(self):
        """Test form validation with missing fields"""
        print("\n🔍 Testing Form Validation...")
        
        # Test missing magento_url
        success1, _ = self.run_test(
            "Missing Magento URL",
            "POST",
            "test-connection",
            422,  # Validation error
            data={
                "access_token": "test-token"
            }
        )
        
        # Test missing access_token
        success2, _ = self.run_test(
            "Missing Access Token",
            "POST",
            "test-connection",
            422,  # Validation error
            data={
                "magento_url": "https://test-store.com"
            }
        )
        
        # Test empty fields
        success3, _ = self.run_test(
            "Empty Fields",
            "POST",
            "test-connection",
            502,  # Connection error with empty values
            data={
                "magento_url": "",
                "access_token": ""
            }
        )
        
        return success1 or success2 or success3

def main():
    print("🚀 Starting Magento Price Manager API Tests")
    print("=" * 60)
    
    tester = MagentoAPITester()
    
    # Run all tests
    print("\n📋 Running Backend API Tests...")
    
    # Basic endpoint tests
    tester.test_root_endpoint()
    
    # Configuration tests
    tester.test_save_config()
    tester.test_load_config()
    
    # Form validation tests
    tester.test_form_validation()
    
    # Connection tests with various scenarios
    tester.test_connection_with_invalid_data()
    tester.test_connection_with_valid_format()
    
    # API endpoint tests
    tester.test_store_views_invalid()
    tester.test_products_invalid()
    tester.test_update_price_invalid()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Test Results Summary:")
    print(f"   Total Tests: {tester.tests_run}")
    print(f"   Passed: {tester.tests_passed}")
    print(f"   Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    # Save detailed results
    results_file = f"/app/test_reports/backend_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "failed_tests": tester.tests_run - tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100
            },
            "detailed_results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    # Return appropriate exit code
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
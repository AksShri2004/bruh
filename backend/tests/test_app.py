import unittest
import sys
import os
import json
from unittest.mock import MagicMock, patch

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app

class TestSpamBackend(unittest.TestCase):
    def setUp(self):
        self.app = app.app.test_client()
        self.app.testing = True

        # Set up environment variables for testing
        os.environ['API_KEY'] = 'test-admin-key'

        # Patch the CLIENT_KEYS and ADMIN_KEY in the app module if necessary
        # Since they are loaded at module level, we might need to rely on what was loaded
        # or reload the module, but for now we'll assume we can mock the validation or
        # that we can use the keys if we set them before import (which we didn't).
        # Let's mock `is_valid_key_from_request` to simplify authentication testing for logic.

    def test_health_check(self):
        """Test the health check endpoint."""
        response = self.app.get('/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('ok', data)

    @patch('app.model')
    @patch('app.tfidf')
    @patch('app.is_valid_key_from_request')
    def test_predict_spam(self, mock_is_valid, mock_tfidf, mock_model):
        """Test the predict endpoint with a spam email."""
        # Mock auth to pass
        mock_is_valid.return_value = True

        # Mock TF-IDF transformation
        mock_vector = MagicMock()
        mock_tfidf.transform.return_value = mock_vector

        # Mock Model prediction (1 = spam)
        mock_model.predict.return_value = [1]

        payload = {'email_text': 'WINNER! Claim your prize now!'}
        headers = {'Content-Type': 'application/json', 'x-api-key': 'any-key'}

        response = self.app.post('/predict', data=json.dumps(payload), headers=headers)

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['prediction'], 'spam')

    @patch('app.model')
    @patch('app.tfidf')
    @patch('app.is_valid_key_from_request')
    def test_predict_not_spam(self, mock_is_valid, mock_tfidf, mock_model):
        """Test the predict endpoint with a regular email."""
        # Mock auth to pass
        mock_is_valid.return_value = True

        # Mock TF-IDF
        mock_tfidf.transform.return_value = MagicMock()

        # Mock Model prediction (0 = not spam)
        mock_model.predict.return_value = [0]

        payload = {'email_text': 'Hey, are we still meeting for lunch?'}
        headers = {'Content-Type': 'application/json', 'x-api-key': 'any-key'}

        response = self.app.post('/predict', data=json.dumps(payload), headers=headers)

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['prediction'], 'not spam')

    @patch('app.model')
    @patch('app.tfidf')
    @patch('app.is_valid_key_from_request')
    def test_missing_field(self, mock_is_valid, mock_tfidf, mock_model):
        """Test error handling for missing email_text."""
        mock_is_valid.return_value = True
        # Ensure model is "loaded" so we don't hit the 500 error
        mock_model.return_value = MagicMock()
        mock_tfidf.return_value = MagicMock()

        payload = {'wrong_field': 'some text'}
        headers = {'Content-Type': 'application/json', 'x-api-key': 'any-key'}

        response = self.app.post('/predict', data=json.dumps(payload), headers=headers)

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)

    def test_unauthorized(self):
        """Test that requests without valid keys are rejected."""
        # We rely on the actual is_valid_key_from_request logic here.
        # Since we didn't inject keys before import, the defaults might be empty or None.
        # But `is_valid_key_from_request` should return False if no header is present.

        payload = {'email_text': 'test'}
        response = self.app.post('/predict', data=json.dumps(payload)) # No headers

        self.assertEqual(response.status_code, 401)

if __name__ == '__main__':
    unittest.main()

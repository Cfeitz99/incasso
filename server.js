const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Get environment variables from Railway
const oauthUsername = process.env.OAUTH_USERNAME;
const oauthPassword = process.env.OAUTH_PASSWORD;
const tokenUrl = process.env.TOKEN_URL; // This should be 'https://sunny-picture-production.up.railway.app/klippa/token'
const fastApiBaseUrl = 'https://sunny-picture-production.up.railway.app';

let paymentUrls = {};

// Function to get an OAuth token
async function getAccessToken() {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  const payload = new URLSearchParams({
    username: oauthUsername,
    password: oauthPassword,
    grant_type: 'password',
  });

  try {
    const response = await axios.post(tokenUrl, payload, { headers });
    console.log('Access token response:', response.data);
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.message);
    return null;
  }
}

// Serve the static HTML file for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the static HTML file for the waiting page
app.get('/waiting-for-payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'waiting-for-payment.html'));
});

// Endpoint to create a Mollie payment
app.get('/create-payment', async (req, res) => {
  const contactId = req.query.contact_id;
  const companyId = req.query.company_id;

  try {
    // Validate that either contactId or companyId is provided
    if (!contactId && !companyId) {
      throw new Error('No contact ID or company ID provided');
    }

    // Get the access token
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(500).send('Failed to authenticate with FastAPI service');
    }

    // Prepare the query parameter for the FastAPI request
    const idParam = contactId ? `contact_id=${contactId}` : `company_id=${companyId}`;
    const fastApiUrl = `${fastApiBaseUrl}/mollie/generate-payment-url?${idParam}`;

    // Call the FastAPI service to generate the Mollie payment URL
    const response = await axios.get(fastApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success && response.data.checkout_link) {
      const checkoutUrl = response.data.checkout_link;
      console.log(`Successfully generated Mollie payment URL: ${checkoutUrl}`);
      
      // Redirect the user to the Mollie payment URL
      return res.redirect(checkoutUrl);
    } else {
      console.error('Error generating Mollie payment URL:', response.data.error);
      return res.status(500).send('Error generating payment URL');
    }
  } catch (error) {
    console.error('Error in /create-payment:', error.message);
    return res.status(500).send(`Error creating payment: ${error.message}`);
  }
});

// Endpoint to receive the payment URL from Zapier
app.post('/receive-payment-url', express.json(), (req, res) => {
  const { paymentUrl, contactId } = req.body;
  console.log(`Received payment URL for contactId ${contactId}: ${paymentUrl}`);

  if (!contactId || !paymentUrl) {
    console.error('Invalid data received for payment URL');
    return res.status(400).json({ success: false, message: 'Invalid data received' });
  }

  // Store the payment URL using the contact ID as a key
  paymentUrls[contactId] = paymentUrl;
  console.log(`Payment URL stored for contactId ${contactId}`);
  res.status(200).json({ success: true });
});

// Endpoint to check if payment URL is ready
app.get('/check-payment-url', (req, res) => {
  const contactId = req.query.contact_id;
  const companyId = req.query.company_id;
  const id = contactId || companyId;
  console.log(`Checking payment URL for ID ${id}:`, paymentUrls[id]);

  const paymentUrl = paymentUrls[id];
  if (paymentUrl) {
    console.log(`Payment URL available for ID ${id}`);
    res.json({ available: true, paymentUrl });
  } else {
    console.log(`No payment URL available for ID ${id}`);
    res.json({ available: false });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

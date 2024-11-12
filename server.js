const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve the static HTML file for the homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the static HTML file for the waiting page
app.get('/waiting-for-payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'waiting-for-payment.html'));
});

// In-memory storage for the payment URLs
let paymentUrls = {};

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


app.get('/create-payment', async (req, res) => {
  const contactId = req.query.contact_id;
  const companyId = req.query.company_id;

  try {
    // Validate that either contactId or companyId is provided
    if (!contactId && !companyId) {
      throw new Error('No contact ID or company ID provided');
    }

    const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/16510018/38cygnn/';
    
    // Choose which ID to send to Zapier
    const payload = contactId ? { contactId } : { companyId };
    
    // Make a POST request to the Zapier webhook
    await axios.post(zapierWebhookUrl, payload);

    // Redirect to the waiting page with the appropriate query parameter
    const idParam = contactId ? `contact_id=${contactId}` : `company_id=${companyId}`;
    res.redirect(`/waiting-for-payment?${idParam}`);
  } catch (error) {
    return res.status(500).send(`Error creating payment: ${error.message}`);
  }
});

app.get('/check-payment-url', (req, res) => {
  const contactId = req.query.contact_id;
  const companyId = req.query.company_id;

  // Use contactId or companyId to fetch the payment URL
  const id = contactId || companyId;
  console.log(`Checking payment URL for ID ${id}:`, paymentUrls[id]);

  const paymentUrl = paymentUrls[id];

  if (paymentUrl) {
    console.log(`Payment URL available for ID ${id}`);
    res.json({ available: true, paymentUrl: paymentUrl });
  } else {
    console.log(`No payment URL available for ID ${id}`);
    res.json({ available: false });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

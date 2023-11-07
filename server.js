const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve the static HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// In-memory storage for the payment URLs
let paymentUrls = {};

// Endpoint to receive the payment URL from Zapier
app.post('/receive-payment-url', express.json(), (req, res) => {
  const { paymentUrl, contactId } = req.body;
  console.log('Received payment URL:', paymentUrl);
  
  // Store the payment URL using the contact ID as a key
  paymentUrls[contactId] = paymentUrl;
  
  res.status(200).json({ success: true });
});

// Endpoint to create payment and redirect user
app.get('/create-payment', async (req, res) => {
  const contactId = req.query.contact_id;

  try {
    if (!contactId) {
      throw new Error('No contact ID provided');
    }

    const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/16510018/38cygnn/';

    // Make a POST request to the Zapier webhook with the contact ID
    await axios.post(zapierWebhookUrl, { contactId });

    // Redirect to a waiting page that will handle the actual redirection to the payment URL
    res.redirect(`/redirect-to-payment?contact_id=${contactId}`);
  } catch (error) {
    return res.status(500).send(`Error creating payment: ${error.message}`);
  }
});

// Endpoint to redirect user to the actual payment URL
app.get('/redirect-to-payment', (req, res) => {
  const contactId = req.query.contact_id;
  
  const paymentUrl = paymentUrls[contactId];
  
  if (paymentUrl) {
    delete paymentUrls[contactId];
    res.send(`<html><head><meta http-equiv="refresh" content="0;url=${paymentUrl}"></head></html>`);
  } else {
    res.status(404).send('Payment URL not found.');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

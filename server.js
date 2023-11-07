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
  console.log('Received payment URL:', paymentUrl);
  
  // Store the payment URL using the contact ID as a key
  paymentUrls[contactId] = paymentUrl;
  
  res.status(200).json({ success: true });
});

// Endpoint to create payment and initiate the process
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
    res.redirect(`/waiting-for-payment?contact_id=${contactId}`);
  } catch (error) {
    return res.status(500).send(`Error creating payment: ${error.message}`);
  }
});

// Endpoint for the frontend to poll for the payment URL availability
app.get('/check-payment-url', (req, res) => {
  const contactId = req.query.contact_id;
  
  // Retrieve the payment URL using the contact ID
  const paymentUrl = paymentUrls[contactId];
  
  if (paymentUrl) {
    res.json({ available: true, paymentUrl: paymentUrl });
  } else {
    res.json({ available: false });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

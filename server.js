const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve the static HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ... (the rest of your server setup)

// Endpoint to create payment and redirect user
app.get('/create-payment', async (req, res) => {
  const contactId = req.query.contact_id; // Extract contact_id from the query parameters

  try {
    if (!contactId) {
      throw new Error('No contact ID provided');
    }

    // Insert the actual Zapier webhook URL here
    const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/16510018/38cygnn/';

    // Make a POST request to the Zapier webhook with the contact ID
    const zapierResponse = await axios.post(zapierWebhookUrl, { contactId });

    // Zapier should respond with the payment URL in the response body
    if (zapierResponse.data && zapierResponse.data.paymentUrl) {
      // Redirect the user to the payment URL provided by Zapier
      return res.redirect(zapierResponse.data.paymentUrl);
    } else {
      // If the payment URL is not provided, throw an error
      throw new Error('Payment URL not provided by Zapier');
    }
  } catch (error) {
    // If an error occurs, send a 500 status code and the error message
    return res.status(500).send(`Error creating payment: ${error.message}`);
  }
});

// Add this to your server.js file
app.post('/receive-payment-url', express.json(), (req, res) => {
  console.log('Received payment URL:', req.body.paymentUrl);
  // Here you would handle the payment URL
  // For now, we're just logging it
  res.status(200).json({ success: true });
});

// Start the server on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// In-memory storage for the payment URLs
let paymentUrls = {};

app.post('/receive-payment-url', express.json(), (req, res) => {
  const { paymentUrl, contactId } = req.body;
  console.log('Received payment URL:', paymentUrl);
  
  // Store the payment URL using the contact ID as a key
  paymentUrls[contactId] = paymentUrl;
  
  res.status(200).json({ success: true });
});

app.get('/redirect-to-payment', (req, res) => {
  const contactId = req.query.contact_id; // You would pass this when redirecting the client here
  
  // Retrieve the payment URL using the contact ID
  const paymentUrl = paymentUrls[contactId];
  
  if (paymentUrl) {
    // Clear the payment URL from memory after retrieving it
    delete paymentUrls[contactId];
    
    // Serve a page that redirects the user to the payment URL
    res.send(`<html><head><meta http-equiv="refresh" content="0;url=${paymentUrl}"></head></html>`);
  } else {
    res.status(404).send('Payment URL not found.');
  }
});


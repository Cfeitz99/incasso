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


// Endpoint to create payment and initiate the process
app.get('/create-payment', async (req, res) => {
  const contactId = req.query.contact_id;

  try {
    if (!contactId) {
      throw new Error('No contact ID provided');
    }

    // Check if a payment URL has already been requested for this contactId
    if (paymentUrls[contactId]) {
      // If so, just redirect to the waiting page without requesting again
      console.log(`Payment URL already requested for contactId ${contactId}`);
      return res.redirect(`/waiting-for-payment?contact_id=${contactId}`);
    }

    const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/16510018/38cygnn/';

    // Make a POST request to the Zapier webhook with the contact ID
    const response = await axios.post(zapierWebhookUrl, { contactId });

    // Assume the response contains the payment URL
    if (response.data && response.data.paymentUrl) {
      // Store the payment URL
      paymentUrls[contactId] = response.data.paymentUrl;
      // Redirect to the waiting page
      res.redirect(`/waiting-for-payment?contact_id=${contactId}`);
    } else {
      // Handle case where payment URL is not in response
      throw new Error('Payment URL not provided by Mollie');
    }
  } catch (error) {
    return res.status(500).send(`Error creating payment: ${error.message}`);
  }
});


app.get('/check-payment-url', (req, res) => {
  const contactId = req.query.contact_id;
  console.log(`Checking payment URL for contactId ${contactId}:`, paymentUrls[contactId]);
  
  const paymentUrl = paymentUrls[contactId];
  
  if (paymentUrl) {
    console.log(`Payment URL available for contactId ${contactId}`);
    res.json({ available: true, paymentUrl: paymentUrl });
  } else {
    console.log(`No payment URL available for contactId ${contactId}`);
    res.json({ available: false });
  }
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

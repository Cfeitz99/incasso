const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Serve the static HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint to create payment and redirect user
app.get('/create-payment', async (req, res) => {
  const contactId = req.query.contact_id; // Extract contact_id from the query parameters

  try {
    if (!contactId) {
      throw new Error('No contact ID provided');
    }

    // Include the contact ID in the data sent to Zapier
    const zapierResponse = await axios.post('https://hooks.zapier.com/hooks/catch/16510018/38cygnn/', {
      contactId: contactId
    });

    // Zapier should respond with the payment URL in the response body
    if (zapierResponse.data && zapierResponse.data.paymentUrl) {
      return res.redirect(zapierResponse.data.paymentUrl);
    }

    throw new Error('Payment URL not provided by Zapier');
  } catch (error) {
    console.error(error.message);
    return res.status(500).send('Error creating payment. ' + error.message);
  }
});


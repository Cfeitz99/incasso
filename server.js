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
  try {
    // Insert the actual Zapier webhook URL here
    const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/16510018/38cygnn/';

    // Make a POST request to the Zapier webhook
    const zapierResponse = await axios.post(zapierWebhookUrl, {});

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

// Start the server on the specified port
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

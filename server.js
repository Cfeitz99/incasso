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

// Endpoint to check if the payment URL is available
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

// Endpoint to redirect user to the actual payment URL
app.get('/redirect-to-payment', (req, res) => {
  const contactId = req.query.contact_id;
  
  // Serve a page that polls for the payment URL
  res.send(`
    <html>
    <head>
      <title>Waiting for Payment...</title>
      <script>
        function checkPaymentUrl(contactId) {
          fetch(\`/check-payment-url?contact_id=\${contactId}\`)
            .then(response => response.json())
            .then(data => {
              if (data.available) {
                window.location.href = data.paymentUrl;
              } else {
                // Not available yet, check again in a few seconds
                setTimeout(() => checkPaymentUrl(contactId), 3000);
              }
            })
            .catch(error => {
              console.error('Error checking payment URL:', error);
            });
        }
        // Start polling for the payment URL
        checkPaymentUrl('${contactId}');
      </script>
    </head>
    <body>
      <h1>Payment Processing...</h1>
      <p>Please wait, you will be redirected shortly.</p>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

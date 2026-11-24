const express = require('express');
const app = express();
app.use(express.json());

// Sample Armis Asset & Alert Dataset
const sampleAssets = [
  {
    id: 'ARM-ASSET-1001',
    name: 'MRI-Scanner-Floor2',
    ipAddress: '10.24.18.45',
    macAddress: '00:1B:44:11:3A:B7',
    category: 'Medical Devices',
    type: 'MRI Machine',
    manufacturer: 'Siemens Healthineers',
    model: 'MAGNETOM Vida',
    operatingSystem: 'Windows Embedded Standard 7',
    riskLevel: 9,
    riskLevelName: 'High',
    site: { name: 'Chennai-Main-Hospital', location: 'Building B, Floor 2' },
    vulnerabilities: ['CVE-2019-0708', 'CVE-2021-34527']
  },
  {
    id: 'ARM-ASSET-1002',
    name: 'PLC-HVAC-Controller-04',
    ipAddress: '10.24.99.12',
    macAddress: '00:0E:8C:55:21:9A',
    category: 'Industrial / OT',
    type: 'PLC',
    manufacturer: 'Siemens',
    model: 'SIMATIC S7-1200',
    operatingSystem: 'Firmware v4.2',
    riskLevel: 8,
    riskLevelName: 'High',
    site: { name: 'Chennai-Data-Center', location: 'Server Room 1' },
    vulnerabilities: ['CVE-2022-38465']
  }
];

// Health check route (open in browser to verify server is awake)
app.get('/', (req, res) => {
  res.send('Mock Armis API is running!');
});

// 1. OAuth Token Endpoint (Armis v3 style)
app.post('/v3/oauth/token', (req, res) => {
  res.status(200).json({
    data: {
      access_token: 'mock_armis_token_12345',
      token_type: 'Bearer',
      expires_in: 3600
    },
    success: true
  });
});

// 2. PULL Endpoint: ServiceNow calls POST /v3/assets/search to fetch data
app.post('/v3/assets/search', (req, res) => {
  res.status(200).json({
    data: {
      count: sampleAssets.length,
      results: sampleAssets,
      total: sampleAssets.length
    },
    success: true
  });
});

// Return sample Armis JSON on GET / and GET /v3/assets
app.get(['/', '/v3/assets'], (req, res) => {
  res.status(200).json({
    data: {
      count: sampleAssets.length,
      results: sampleAssets,
      total: sampleAssets.length
    },
    success: true
  });
});

// 3. PUSH Endpoint: Trigger this URL to POST sample data straight into ServiceNow
app.post('/push-to-servicenow', async (req, res) => {
  const { snowInstanceUrl, username, password } = req.body;
  if (!snowInstanceUrl || !username || !password) {
    return res.status(400).json({ error: 'Provide snowInstanceUrl, username, and password' });
  }

  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const results = [];

  for (const asset of sampleAssets) {
    const response = await fetch(`${snowInstanceUrl}/api/now/table/u_armis_asset_staging`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        u_armis_id: asset.id,
        u_device_name: asset.name,
        u_ip_address: asset.ipAddress,
        u_mac_address: asset.macAddress,
        u_category: asset.category,
        u_device_type: asset.type,
        u_manufacturer: asset.manufacturer,
        u_model: asset.model,
        u_os: asset.operatingSystem,
        u_risk_score: asset.riskLevel,
        u_risk_level: asset.riskLevelName,
        u_site_name: asset.site.name,
        u_vulnerabilities: asset.vulnerabilities.join(', ')
      })
    });
    results.push(await response.json());
  }

  res.status(200).json({ message: 'Pushed assets to ServiceNow', snowResponses: results });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

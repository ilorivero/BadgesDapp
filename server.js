const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3000;

// Serve os arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para fornecer informações do contrato para o front-end
app.get('/api/contract', (req, res) => {
    try {
        const abi = JSON.parse(fs.readFileSync(path.join(__dirname, 'contract-abi.json'), 'utf-8'));
        res.json({
            address: process.env.CONTRACT_ADDRESS,
            abi: abi
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler as informacoes do contrato.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Verifique se o arquivo .env tem o CONTRACT_ADDRESS correto.`);
});
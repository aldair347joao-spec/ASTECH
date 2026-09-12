const puppeteer = require('puppeteer');
const { Solver } = require('2captcha');

const solver = new Solver(process.env.CAPTCHA_API_KEY);

(async () => {
    console.log('Iniciando o bot de automação VFS...');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', 
            '--disable-gpu'
        ]
    });

    const page = await browser.newPage();
    console.log('Navegador headless pronto no Render.');

    // O próximo passo será adicionar a URL e os seletores do site da VFS aqui

    await browser.close();
})();

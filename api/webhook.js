const { MercadoPagoConfig, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { type, data } = req.body || {};

  if (type === 'payment' && data?.id) {
    try {
      const payment = new Payment(client);
      const result = await payment.get({ id: data.id });

      if (result.status === 'approved') {
        const total = result.transaction_amount;
        const buyer = result.payer?.email || 'cliente';
        const items = (result.additional_info?.items || []).map(i => i.title).join(', ') || 'itens não listados';

        if (process.env.CALLMEBOT_APIKEY) {
          const msg = `✅ VENDA APROVADA!\nComprador: ${buyer}\nTotal: R$ ${total}\nItens: ${items}`;
          const url = `https://api.callmebot.com/whatsapp.php?phone=5585988116379&text=${encodeURIComponent(msg)}&apikey=${process.env.CALLMEBOT_APIKEY}`;
          await fetch(url).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Webhook MP error:', e);
    }
  }

  res.status(200).end();
};

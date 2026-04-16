const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Itens inválidos' });
  }

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: items.map(item => ({
          id: String(item.id),
          title: item.name,
          quantity: item.qty,
          unit_price: item.price,
          currency_id: 'BRL',
        })),
        payment_methods: { installments: 3 },
        back_urls: {
          success: process.env.SITE_URL,
          failure: process.env.SITE_URL,
          pending: process.env.SITE_URL,
        },
        auto_return: 'approved',
        statement_descriptor: 'Le Closet',
      },
    });

    return res.status(200).json({
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (error) {
    console.error('Erro MP:', error);
    return res.status(500).json({ error: 'Erro ao criar preferência' });
  }
};

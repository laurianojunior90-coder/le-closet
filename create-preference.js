import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items, payer } = req.body;

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
          picture_url: undefined, // fotos são base64, não servem para a API do MP
        })),
        payer: payer || {},
        payment_methods: {
          installments: 3, // máximo de parcelas
        },
        back_urls: {
          success: process.env.SITE_URL + '/sucesso',
          failure: process.env.SITE_URL + '/falha',
          pending: process.env.SITE_URL + '/pendente',
        },
        auto_return: 'approved',
        statement_descriptor: 'Lê Closet',
        external_reference: `pedido-${Date.now()}`,
      },
    });

    return res.status(200).json({
      id: result.id,
      init_point: result.init_point,       // URL de checkout (produção)
      sandbox_init_point: result.sandbox_init_point, // URL de checkout (teste)
    });
  } catch (error) {
    console.error('Erro MP:', error);
    return res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
  }
}

import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  const { method } = request;
  const userPrefix = request.headers['x-user-prefix'] || 'default';

  try {
    if (method === 'GET') {
      const { rows } = await sql`
        SELECT 
          id, nome, cnpj, endereco, responsavel, contato, 
          status, obs, lat, lng, arquivos, user_prefix as "userPrefix"
        FROM clientes 
        WHERE user_prefix = ${userPrefix} 
        ORDER BY created_at DESC
      `;
      return response.status(200).json(rows);
    }

    if (method === 'POST') {
      const { 
        id, nome, cnpj, endereco, responsavel, 
        contato, status, obs, lat, lng, arquivos 
      } = request.body;

      // Se o ID for numérico (Date.now()), tratamos como novo ou forçamos UUID
      const isUUID = id && id.length > 20;

      if (isUUID) {
        // UPDATE
        await sql`
          UPDATE clientes SET 
            nome = ${nome}, cnpj = ${cnpj}, endereco = ${endereco}, responsavel = ${responsavel},
            contato = ${contato}, status = ${status}, obs = ${obs}, 
            lat = ${lat}, lng = ${lng}, arquivos = ${JSON.stringify(arquivos || [])}
          WHERE id::text = ${id} AND user_prefix = ${userPrefix}
        `;
        return response.status(200).json({ success: true, message: 'Local atualizado na Nuvem.' });
      } else {
        // INSERT
        const result = await sql`
          INSERT INTO clientes (
            nome, cnpj, endereco, responsavel, contato, 
            status, obs, lat, lng, arquivos, user_prefix
          ) VALUES (
            ${nome}, ${cnpj}, ${endereco}, ${responsavel}, ${contato}, 
            ${status}, ${obs}, ${lat}, ${lng}, ${JSON.stringify(arquivos || [])}, ${userPrefix}
          ) RETURNING id
        `;
        return response.status(201).json({ success: true, id: result.rows[0].id });
      }
    }

    if (method === 'DELETE') {
      const { id } = request.body || request.query;
      if (!id) return response.status(400).json({ error: 'ID is required' });

      await sql`DELETE FROM clientes WHERE id::text = ${id} AND user_prefix = ${userPrefix}`;
      return response.status(200).json({ success: true });
    }

    return response.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('API Error (Clientes):', error);
    return response.status(500).json({ error: error.message });
  }
}

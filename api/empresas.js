import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  // Segurança contra crash 500 sem banco conectado
  if (!process.env.POSTGRES_URL) {
    return response.status(500).json({ 
      error: "POSTGRES_URL não configurada no Vercel. Por favor, conecte o banco de dados Neon no painel Storage." 
    });
  }

  const { method } = request;
  // Usamos um header customizado ou query param para isolar os dados por usuário
  const userPrefix = request.headers['x-user-prefix'] || 'default';

  try {
    if (method === 'GET') {
      const { rows } = await sql`
        SELECT 
          id, nome, site_url as "siteUrl", tipo, status, 
          nome_contato as "nomeContato", telefone, 
          login_cofre as "loginCofre", senha_cofre as "senhaCofre", 
          notas, user_prefix as "userPrefix"
        FROM empresas 
        WHERE user_prefix = ${userPrefix} 
        ORDER BY created_at DESC
      `;
      return response.status(200).json(rows);
    }

    if (method === 'POST') {
      const { 
        id, nome, siteUrl, tipo, status, nomeContato, 
        telefone, loginCofre, senhaCofre, notas 
      } = request.body;

      if (id) {
        // UPDATE - Verifica se o ID é um UUID válido ou fallback para busca por nome se necessário
        await sql`
          UPDATE empresas SET 
            nome = ${nome}, site_url = ${siteUrl}, tipo = ${tipo}, status = ${status},
            nome_contato = ${nomeContato}, telefone = ${telefone}, 
            login_cofre = ${loginCofre}, senha_cofre = ${senhaCofre}, notas = ${notas}
          WHERE id::text = ${id} AND user_prefix = ${userPrefix}
        `;
        return response.status(200).json({ success: true, message: 'Empresa atualizada em nuvem.' });
      } else {
        // INSERT
        const result = await sql`
          INSERT INTO empresas (
            nome, site_url, tipo, status, nome_contato, telefone, 
            login_cofre, senha_cofre, notas, user_prefix
          ) VALUES (
            ${nome}, ${siteUrl}, ${tipo}, ${status}, ${nomeContato}, ${telefone}, 
            ${loginCofre}, ${senhaCofre}, ${notas}, ${userPrefix}
          ) RETURNING id
        `;
        return response.status(201).json({ success: true, id: result.rows[0].id });
      }
    }

    if (method === 'DELETE') {
      const { id } = request.body || request.query;
      if (!id) return response.status(400).json({ error: 'ID is required' });

      await sql`DELETE FROM empresas WHERE id::text = ${id} AND user_prefix = ${userPrefix}`;
      return response.status(200).json({ success: true });
    }

    return response.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('API Error (Empresas):', error);
    return response.status(500).json({ error: error.message });
  }
}

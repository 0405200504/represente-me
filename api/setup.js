import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  // Segurança contra crash 500 sem banco conectado
  if (!process.env.POSTGRES_URL) {
    return response.status(500).json({ 
      error: "POSTGRES_URL não configurada no Vercel. Por favor, conecte o banco de dados Neon no painel Storage." 
    });
  }

  try {
    // Tabela de Integrações (Empresas)
    await sql`
      CREATE TABLE IF NOT EXISTS empresas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        site_url TEXT,
        tipo TEXT,
        status TEXT,
        nome_contato TEXT,
        telefone TEXT,
        login_cofre TEXT,
        senha_cofre TEXT,
        notas TEXT,
        user_prefix TEXT,
        is_pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Tabela de Clientes/Lojistas (Mapa)
    await sql`
      CREATE TABLE IF NOT EXISTS clientes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome TEXT NOT NULL,
        cnpj TEXT,
        endereco TEXT,
        responsavel TEXT,
        contato TEXT,
        status TEXT DEFAULT 'ativo',
        obs TEXT,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        arquivos JSONB DEFAULT '[]',
        user_prefix TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return response.status(200).json({ 
      success: true, 
      message: 'Esquema de banco de dados atualizado com suporte a coordenadas e arquivos!' 
    });
  } catch (error) {
    console.error('Setup Error:', error);
    return response.status(500).json({ success: false, error: error.message });
  }
}

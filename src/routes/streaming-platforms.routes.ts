import { Router } from 'express';
import { Pool } from 'pg';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { getSSLConfig } = require('../utils/ssl-config');
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    const pool = new Pool({
      connectionString: connectionString,
      ssl: getSSLConfig(connectionString)
    });

    const platformsResult = await pool.query(`
      SELECT 
        id,
        name,
        category,
        "showFilter",
        "logoPath",
        "baseUrl",
        "hasFreeTrial",
        "freeTrialDuration"
      FROM "StreamingPlatform"
      ORDER BY 
        CASE "showFilter"
          WHEN 'PRIORITY' THEN 1
          WHEN 'SECONDARY' THEN 2
          WHEN 'HIDDEN' THEN 3
          ELSE 4
        END,
        CASE category
          WHEN 'SUBSCRIPTION_PRIMARY' THEN 1
          WHEN 'HYBRID' THEN 2
          WHEN 'RENTAL_PURCHASE_PRIMARY' THEN 3
          WHEN 'FREE_PRIMARY' THEN 4
          ELSE 5
        END,
        name
    `);

    await pool.end();

    const platforms = platformsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      showFilter: row.showFilter,
      logoPath: row.logoPath,
      baseUrl: row.baseUrl,
      hasFreeTrial: row.hasFreeTrial,
      freeTrialDuration: row.freeTrialDuration
    }));

    res.json(platforms);

  } catch (error) {
    console.error('Erro ao buscar plataformas de streaming:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;


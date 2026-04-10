import { FastifyPluginAsync } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index';

const diagramRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/diagrams — 新規ダイアグラムを作成
  fastify.post('/', async (_request, reply) => {
    const id = uuidv4();
    await db.query('INSERT INTO diagrams (id) VALUES ($1)', [id]);
    return reply.status(201).send({ id });
  });

  // GET /api/diagrams/:id — 存在確認
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const result = await db.query(
      'SELECT id, created_at FROM diagrams WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Diagram not found' });
    }

    // アクセス日時を更新
    await db.query(
      'UPDATE diagrams SET last_accessed_at = NOW() WHERE id = $1',
      [id],
    );

    return reply.send({
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at,
    });
  });
};

export default diagramRoutes;

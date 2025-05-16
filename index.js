import { Sequelize, DataTypes } from 'sequelize';
import express from 'express';
import { body, validationResult } from 'express-validator';

// Documentación de los endpoints
// GET /libros - Listar todos los libros
// GET /libros/buscar/:id - Obtener un libro específico por ID
// POST /libros - Crear un nuevo libro
// PUT /libros/buscar/:id - Actualizar un libro existente por ID
// DELETE /libros/buscar/:id - Eliminar un libro por ID
// GET /libros/buscar - Buscar libros por parámetros (titulo, autor, categoria)

// Configuración básica para conectar a SQLite con Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite', // Archivo donde se guardará la base de datos
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Conexión establecida correctamente.');
  } catch (error) {
    console.error('No se pudo conectar a la base de datos:', error);
  }
}

testConnection();

// Definición del modelo Libro
const Libro = sequelize.define('Libro', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  titulo: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  autor: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  isbn: {
    type: DataTypes.STRING(13),
    allowNull: false,
    unique: true,
  },
  categoria: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  defaultScope: {
    order: [['titulo', 'ASC']],
  },
});

// Sincronizar el modelo con la base de datos
async function syncModels() {
  await Libro.sync();
  console.log('Modelo Libro sincronizado con la base de datos.');
}

syncModels();

const app = express();
const PORT = 3000;

app.use(express.json()); // Middleware para parsear JSON

// Listar todos los libros ordenados alfabéticamente por título con paginación
app.get('/libros', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3; // Limitar a 3 libros por defecto
    const offset = parseInt(req.query.offset) || 0; // Desplazamiento inicial

    const libros = await Libro.findAll({
      limit,
      offset,
      order: [[sequelize.fn('LOWER', sequelize.col('titulo')), 'ASC']], // Ordenar ignorando mayúsculas y minúsculas
    });

    res.json(libros);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los libros' });
  }
});

// Buscar libros por parámetros (titulo, autor, categoria)
app.get('/libros/buscar', async (req, res) => {
  try {
    const { titulo, autor, categoria } = req.query;
    const where = {};
    if (titulo) where.titulo = { [Sequelize.Op.like]: `%${titulo}%` };
    if (autor) where.autor = { [Sequelize.Op.like]: `%${autor}%` };
    if (categoria) where.categoria = { [Sequelize.Op.like]: `%${categoria}%` };
    const libros = await Libro.findAll({ where });
    res.json(libros);
  } catch (error) {
    res.status(500).json({ error: 'Error al buscar libros' });
  }
});

// Obtener un libro específico
app.get('/libros/buscar/:id', async (req, res) => {
  try {
    const libro = await Libro.findByPk(req.params.id);
    if (!libro) {
      return res.status(404).json({ error: 'Libro no encontrado' });
    }
    res.json(libro);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el libro' });
  }
});

// Crear un nuevo libro
app.post(
  '/libros',
  [
    body('titulo').notEmpty().withMessage('El título no puede estar vacío').isString().withMessage('El título debe ser una cadena de texto'),
    body('autor').notEmpty().withMessage('El autor no puede estar vacío').isString().withMessage('El autor debe ser una cadena de texto'),
    body('isbn')
      .notEmpty().withMessage('El ISBN no puede estar vacío')
      .isLength({ min: 13, max: 13 }).withMessage('El ISBN debe tener exactamente 13 dígitos')
      .isNumeric().withMessage('El ISBN solo puede contener números'),
    body('categoria')
      .notEmpty().withMessage('La categoría no puede estar vacía')
      .isIn(['novela', 'cuento', 'poesía', 'ensayo', 'teatro', 'biografía', 'historia', 'infantil', 'fantasía', 'ciencia ficción', 'misterio', 'romance', 'aventura', 'autoayuda', 'otro'])
      .withMessage('La categoría no es válida'),
    body('estado')
      .notEmpty().withMessage('El estado no puede estar vacío')
      .isIn(['disponible', 'prestado']).withMessage('El estado solo puede ser disponible o prestado'),
    body('fecha_creacion')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('La fecha de creación debe estar en formato YYYY-MM-DD'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ mensaje: 'Datos inválidos', errores: errors.array() });
    }
    try {
      const { titulo, autor, isbn, categoria, estado, fecha_creacion } = req.body;
      const libro = await Libro.create({ titulo, autor, isbn, categoria, estado, fecha_creacion });
      res.status(201).json(libro);
    } catch (error) {
      res.status(400).json({ error: 'Error al crear el libro', detalles: error.message });
    }
  }
);

// Actualizar un libro
app.put(
  '/libros/buscar/:id',
  [
    body('titulo').notEmpty().withMessage('El título es obligatorio'),
    body('autor')
      .notEmpty().withMessage('El autor es obligatorio')
      .matches(/^[^\d]+$/).withMessage('El autor no puede contener números'),
    body('isbn')
      .notEmpty().withMessage('El ISBN es obligatorio')
      .isLength({ min: 10, max: 13 }).withMessage('El ISBN debe tener entre 10 y 13 dígitos')
      .isNumeric().withMessage('El ISBN solo puede contener números'),
    body('categoria')
      .notEmpty().withMessage('La categoría es obligatoria')
      .isIn(['novela', 'cuento', 'poesía', 'ensayo', 'teatro', 'biografía', 'historia', 'infantil', 'fantasía', 'ciencia ficción', 'misterio', 'romance', 'aventura', 'autoayuda', 'otro'])
      .withMessage('La categoría no es válida'),
    body('estado')
      .notEmpty().withMessage('El estado es obligatorio')
      .isIn(['disponible', 'prestado']).withMessage('El estado solo puede ser disponible o prestado'),
    body('fecha_creacion')
      .optional()
      .isISO8601().withMessage('La fecha de creación debe ser una fecha válida (ISO 8601)'),
    body('id')
      .optional()
      .isInt().withMessage('El id solo puede contener números'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ mensaje: 'Datos inválidos' });
    }
    try {
      const libro = await Libro.findByPk(req.params.id);
      if (!libro) {
        return res.status(404).json({ error: 'Libro no encontrado' });
      }
      await libro.update(req.body);
      res.json(libro);
    } catch (error) {
      res.status(400).json({ error: 'Error al actualizar el libro', detalles: error.message });
    }
  }
);

// Eliminar un libro
app.delete('/libros/buscar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const libro = await Libro.findByPk(id);
    if (!libro) {
      return res.status(404).json({ error: 'Libro no encontrado' });
    }
    await libro.destroy();
    res.json({ mensaje: 'Libro eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el libro' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Express escuchando en http://localhost:${PORT}`);
});

export default sequelize;
export { Libro };

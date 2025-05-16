import { Sequelize, DataTypes } from 'sequelize';
import express from 'express';
import { body, validationResult } from 'express-validator';

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

app.get('/libros', async (req, res) => {
  try {
    const libros = await Libro.findAll();
    res.json(libros);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los libros' });
  }
});

app.get('/libros/:id', async (req, res) => {
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

app.post(
  '/libros',
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
      const { id, titulo, autor, isbn, categoria, estado, fecha_creacion } = req.body;
      const libro = await Libro.create({ id, titulo, autor, isbn, categoria, estado, fecha_creacion });
      res.status(201).json(libro);
    } catch (error) {
      res.status(400).json({ error: 'Error al crear el libro', detalles: error.message });
    }
  }
);

app.put(
  '/libros/:id',
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

app.delete('/libros/:id', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Servidor Express escuchando en http://localhost:${PORT}`);
});

export default sequelize;
export { Libro };

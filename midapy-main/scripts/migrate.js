const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

// Vérification des variables d'environnement requises
const requiredEnvVars = ['SUPABASE_DB_URL'];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error('Variables d\'environnement manquantes:');
    missingEnvVars.forEach(varName => console.error(`- ${varName}`));
    console.error('\nAssurez-vous que ces variables sont définies dans votre environnement.');
    process.exit(1);
}

// Configuration du client PostgreSQL
const connectionString = process.env.SUPABASE_DB_URL;
// Forcer la désactivation de SSL dans l'URL de connexion
const connectionStringWithoutSSL = connectionString + "?sslmode=disable";

const client = new Client({
    connectionString: connectionStringWithoutSSL,
    ssl: false
});

// Fonction pour lire un fichier SQL et résoudre les imports
function readSqlFileWithImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let resolvedContent = '';

    for (const line of lines) {
        // Si c'est une ligne d'import
        if (line.trim().startsWith('\\ir')) {
            // Extraire le chemin relatif du fichier à importer
            const importPath = line.trim().split(' ')[1];
            // Construire le chemin absolu
            const absoluteImportPath = path.resolve(path.dirname(filePath), importPath);
            
            console.log(`Résolution de l'import: ${importPath}`);
            
            try {
                // Lire le contenu du fichier importé
                const importedContent = fs.readFileSync(absoluteImportPath, 'utf8');
                resolvedContent += '\n' + importedContent + '\n';
            } catch (error) {
                console.error(`Erreur lors de la lecture du fichier importé ${importPath}:`, error);
                throw error;
            }
        } else {
            resolvedContent += line + '\n';
        }
    }

    return resolvedContent;
}

async function migrate() {
    try {
        // Connexion à la base de données
        await client.connect();
        console.log('✅ Connecté à la base de données\n');

        // Lecture des fichiers de migration
        const migrationsDir = path.join(__dirname, '../supabase/migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log('📁 Fichiers de migration trouvés:', files, '\n');

        // Création de la table des migrations
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Exécution des migrations
        for (const file of files) {
            console.log(`\n📦 Migration: ${file}`);

            try {
                // Vérifier si la migration a déjà été exécutée
                const { rows } = await client.query(
                    'SELECT id FROM migrations WHERE name = $1',
                    [file]
                );

                if (rows.length > 0) {
                    console.log(`⏭️  Migration ${file} déjà exécutée, passage à la suivante`);
                    continue;
                }

                // Lecture et résolution des imports
                const filePath = path.join(migrationsDir, file);
                const sql = readSqlFileWithImports(filePath);

                // Exécution de la migration dans une transaction
                await client.query('BEGIN');
                
                try {
                    await client.query(sql);
                    await client.query(
                        'INSERT INTO migrations (name) VALUES ($1)',
                        [file]
                    );
                    await client.query('COMMIT');
                    console.log(`✅ Migration ${file} exécutée avec succès`);
                } catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                }

            } catch (error) {
                console.error(`❌ Erreur lors de la migration ${file}:`, error);
                throw error;
            }
        }

        console.log('\n✨ Toutes les migrations ont été exécutées avec succès!');

    } catch (error) {
        console.error('\n❌ Erreur lors des migrations:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

// Exporter la fonction migrate
module.exports = migrate;

// Si le script est exécuté directement (pas importé comme module)
if (require.main === module) {
    migrate();
}

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runMigration() {
  try {
    console.log('Running database migration...');
    
    // Executar a migração do Prisma
    const { stdout: migrateOutput, stderr: migrateError } = await execAsync('npx prisma migrate dev --name update_sentiment_data');
    console.log('Migration output:', migrateOutput);
    if (migrateError) console.error('Migration error:', migrateError);

    // Executar o script de atualização de sentimentos
    console.log('Running sentiment update script...');
    const { stdout: updateOutput, stderr: updateError } = await execAsync('npx ts-node src/scripts/updateSentiments.ts');
    console.log('Update output:', updateOutput);
    if (updateError) console.error('Update error:', updateError);

    console.log('Database migration and sentiment update completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

runMigration(); 
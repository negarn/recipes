import { spawn } from 'node:child_process';

const build = Bun.spawn(['bun', 'run', 'build'], { stdout: 'inherit', stderr: 'inherit' });
if (await build.exited) process.exit(1);

const commands = [
  ['node_modules/.bin/vite', 'build', '--watch', '--emptyOutDir=false'],
  ['bun', 'build', 'worker/index.ts', '--target=browser', '--format=esm', '--outfile=dist/_worker.js', '--watch'],
  ['node_modules/.bin/wrangler', 'pages', 'dev', 'dist', '--port', '8788']
];
const children = commands.map(([command, ...args]) => spawn(command, args, { stdio: 'inherit' }));
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
for (const child of children) {
  child.on('exit', (code) => stop(code ?? 1));
  child.on('error', (error) => { console.error(error.message); stop(1); });
}

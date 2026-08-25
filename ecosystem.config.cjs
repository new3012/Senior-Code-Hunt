module.exports = {
  apps: [
    {
      name: "senior-code-hunt",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3002
      }
    }
  ]
};


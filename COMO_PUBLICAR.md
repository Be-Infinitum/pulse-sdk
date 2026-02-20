# Como Publicar o @beinfi/pulse-sdk no GitHub Packages

Guia passo-a-passo para publicar no GitHub Packages da org Be-Infinitum.

---

## Passo 1: Autenticar no GitHub Packages (1 vez por maquina)

Voce precisa de um **Personal Access Token (classic)** com os scopes:
- `read:packages`
- `write:packages`

### Criar o token

1. Va em https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Marque `write:packages` e `read:packages`
4. Copie o token gerado

### Fazer login no npm apontando pro GitHub

```bash
npm login --registry=https://npm.pkg.github.com
```

Vai pedir:
- **Username**: seu usuario do GitHub
- **Password**: o Personal Access Token (NAO a senha do GitHub)
- **Email**: seu email

Pra verificar:
```bash
npm whoami --registry=https://npm.pkg.github.com
```

---

## Passo 2: Buildar o SDK

```bash
cd /Users/caiofelix/Infinitum/pulse-sdk
npm run build
```

## Passo 3: Verificar o que vai ser publicado

```bash
npm pack --dry-run
```

Deve mostrar:
- `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`, etc.
- `README.md`
- `package.json`

## Passo 4: Publicar

```bash
npm publish
```

**Se der certo:**
```
+ @beinfi/pulse-sdk@0.1.0
```

O pacote estara em: https://github.com/orgs/Be-Infinitum/packages

---

## Publicar o n8n node

```bash
cd n8n
npm run build
npm publish
```

---

## Como publicar novas versoes

### 1. Atualize a versao no package.json

```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

### 2. Builde e publique

```bash
npm run build
npm publish
```

---

## Como instalar os pacotes (para consumidores)

Quem for instalar precisa configurar o scope `@beinfi` pra apontar pro GitHub:

```bash
# Adicionar no .npmrc do projeto (ou global ~/.npmrc)
echo "@beinfi:registry=https://npm.pkg.github.com" >> .npmrc
```

E estar autenticado:
```bash
npm login --registry=https://npm.pkg.github.com
```

Depois:
```bash
npm install @beinfi/pulse-sdk
```

---

## Automacao via GitHub Actions

O arquivo `.github/workflows/publish.yml` publica automaticamente quando uma Release e criada no GitHub. Funciona com o token `GITHUB_TOKEN` do proprio Actions (nao precisa de secret extra).

---

## Checklist antes de publicar a primeira vez

- [ ] Personal Access Token criado com `write:packages`
- [ ] `npm login --registry=https://npm.pkg.github.com` feito
- [ ] `npm run build` roda sem erro
- [ ] `npm pack --dry-run` mostra so os arquivos esperados
- [ ] README.md esta bonito e com exemplos corretos
- [ ] Versao no package.json esta correta (0.1.0)
- [ ] `npm publish` executado

## Resumo dos comandos (em ordem)

```bash
# Setup (1 vez)
npm login --registry=https://npm.pkg.github.com

# Publicar SDK
cd /Users/caiofelix/Infinitum/pulse-sdk
npm run build
npm pack --dry-run          # verificar
npm publish                 # publicar

# Publicar n8n node
cd n8n
npm run build
npm publish

# Novas versoes
npm version patch           # ou minor/major
npm run build
npm publish
```

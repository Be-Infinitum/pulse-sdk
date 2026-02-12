# Como Publicar o @infi/pulse-sdk no npm

Guia passo-a-passo pra quem nunca publicou um pacote npm.

---

## Passo 1: Criar conta no npm (1 vez so)

1. Acesse https://www.npmjs.com/signup
2. Crie uma conta (email, username, senha)
3. **Confirme o email** (npm exige isso pra publicar)

## Passo 2: Criar a organizacao "@infi" no npm (1 vez so)

Pacotes com `@` na frente (como `@infi/pulse-sdk`) pertencem a uma **organizacao** (ou "scope") no npm.

1. Acesse https://www.npmjs.com/org/create
2. Nome da org: `infi`
3. Plano: **Free** (unlimited public packages)
4. Adicione o outro founder como membro se quiser

**Se o nome `infi` ja estiver pego:**
- Tente `infinitum`, `beinfi`, `pulsepay` ou outro nome
- Atualize o `name` no `package.json` pra bater (ex: `@beinfi/pulse-sdk`)

## Passo 3: Fazer login no npm pelo terminal (1 vez por maquina)

```bash
npm login
```

Vai pedir:
- Username (da conta npm)
- Password
- Email
- OTP (se tiver 2FA ativado — recomendo ativar)

Pra verificar que ta logado:
```bash
npm whoami
# deve mostrar seu username
```

## Passo 4: Buildar o SDK

```bash
cd /Users/caiofelix/Infinitum/pulse-sdk
npm run build
```

Isso gera os arquivos em `dist/`:
- `index.js` (ESM)
- `index.cjs` (CommonJS)
- `index.d.ts` (TypeScript types)
- `checkout.js` (standalone browser bundle)

## Passo 5: Verificar o que vai ser publicado

```bash
npm pack --dry-run
```

Isso mostra EXATAMENTE quais arquivos vao pro npm. Deve mostrar:
- `dist/index.js`
- `dist/index.cjs`
- `dist/index.d.ts`
- `dist/index.d.cts`
- `dist/checkout.js`
- `README.md`
- `package.json`

**Se aparecer algo estranho** (tipo `.env`, `node_modules`, codigo fonte), pare e ajuste o campo `"files"` no package.json.

## Passo 6: Publicar

```bash
npm publish --access public
```

O `--access public` e OBRIGATORIO na primeira vez pra pacotes com scope (`@infi/...`). Sem isso, o npm tenta publicar como privado (que e pago).

**Se der certo, voce vera:**
```
+ @infi/pulse-sdk@0.1.0
```

**O pacote agora esta em:** https://www.npmjs.com/package/@infi/pulse-sdk

## Passo 7: Testar a instalacao

Em qualquer projeto:
```bash
npm install @infi/pulse-sdk
```

Deve funcionar e o TypeScript deve reconhecer os tipos.

---

## Como publicar novas versoes

Toda vez que atualizar o SDK:

### 1. Atualize a versao no package.json

Use semantic versioning (semver):
- **Patch** (0.1.0 → 0.1.1): bug fix, sem mudanca de API
- **Minor** (0.1.0 → 0.2.0): feature nova, backwards-compatible
- **Major** (0.1.0 → 1.0.0): breaking change

Comando rapido pra atualizar:
```bash
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0
```

Isso atualiza o `package.json` E cria um git tag automaticamente.

### 2. Builde e publique

```bash
npm run build
npm publish
```

(Nao precisa de `--access public` nas vezes seguintes.)

---

## Automacao (opcional, pra depois)

### GitHub Action pra publicar automaticamente

Crie `.github/workflows/publish.yml` no repo do SDK:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm install
      - run: npm run build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Pra configurar:
1. No npm: Settings → Access Tokens → Generate New Token (type: Automation)
2. Copie o token
3. No GitHub: repo Settings → Secrets → Actions → New secret
   - Nome: `NPM_TOKEN`
   - Valor: o token copiado
4. Agora toda vez que voce criar uma Release no GitHub, publica automaticamente

---

## Checklist antes de publicar a primeira vez

- [ ] Conta npm criada e email confirmado
- [ ] Org `@infi` criada no npm (ou nome alternativo)
- [ ] `npm login` feito no terminal
- [ ] `npm run build` roda sem erro
- [ ] `npm pack --dry-run` mostra so os arquivos esperados
- [ ] README.md esta bonito e com exemplos corretos
- [ ] Versao no package.json esta correta (0.1.0)
- [ ] `npm publish --access public` executado

## Resumo dos comandos (em ordem)

```bash
# Setup (1 vez)
npm login

# Publicar
cd /Users/caiofelix/Infinitum/pulse-sdk
npm run build
npm pack --dry-run          # verificar
npm publish --access public # publicar

# Novas versoes
npm version patch           # ou minor/major
npm run build
npm publish
```

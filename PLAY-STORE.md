# carrer baska — preparação para a Play Store

O projeto Android usa Capacitor e inclui os arquivos do jogo no aplicativo.
Identificador inicial: `io.github.brun0cosmo200.carrerbaska`.

## Compilação

Execute `npm ci`, `npm run build` e `npx cap sync android`.
Abra `android/` no Android Studio com SDK 36 e JDK 21.
O workflow **Android de teste** também gera um APK de desenvolvimento e um
Android App Bundle sem assinatura. Nenhum deles representa aprovação na loja.
O bundle de produção precisa ser assinado com uma chave de upload sob controle
do titular e configurado no Play App Signing. Não envie chaves nem senhas ao Git.

## Ficha inicial da loja

Nome: carrer baska

Descrição curta: Crie seu jogador e construa sua trajetória no basquete.

Descrição: Escolha seu jogador, evolua suas habilidades e acompanhe sua carreira
no basquete. Viva o draft, dispute temporadas, enfrente rivais e confira seus
números e conquistas até a aposentadoria.

## Pendências antes da submissão

- Conta Play Console do titular: cadastro, taxa e verificação de identidade.
- Contato de suporte e política de privacidade identificando o responsável.
- Revisar os formulários de segurança dos dados, público-alvo e classificação
  indicativa com base no comportamento real do aplicativo.
- Revisar direitos de uso dos logos, fotos de atletas, troféus e áudio. A presença
  dos arquivos no projeto não comprova autorização para distribuição comercial.
- Capturas de tela reais em Android e imagem de destaque da loja.
- Testar salvar/retomar carreira, rotação, botão voltar, exportar/importar saves,
  baixar carta e copiar resumo em dispositivo Android. Download de Blob e
  clipboard do navegador podem exigir adaptação nativa; ainda não validados.
- Os saves da PWA não migram automaticamente para o armazenamento do app Android.
- Assinar a versão final, distribuir em testes e somente depois solicitar produção.
- Contas pessoais criadas após 13/11/2023: pelo menos 12 testadores inscritos
  continuamente por 14 dias antes de solicitar acesso à produção.

Fontes:
- https://support.google.com/googleplay/android-developer/answer/6112435
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/9888072
- https://capacitorjs.com/docs/android

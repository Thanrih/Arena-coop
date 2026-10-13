# Centipede Arena — multiplayer na rede local

## Iniciar

1. Dê dois cliques em **iniciar-rede.cmd**. É necessário ter Node.js 20 ou mais recente. Na primeira execução, o script instala as dependências; depois, o jogo funciona sem internet, inclusive a biblioteca gráfica.
2. Abra **http://localhost:3000** no computador que executa o servidor.
3. Seus amigos devem abrir o endereço **http://IP-DO-COMPUTADOR:3000** mostrado no terminal, usando a mesma rede Wi-Fi ou cabeada. Todos acessam o mesmo servidor; cada computador não precisa instalar nada.
4. Se o Windows solicitar acesso à rede para o Node.js, permita na rede **privada**. Mantenha o terminal aberto durante as partidas.

Alternativa pelo terminal, nesta pasta:

```powershell
npm install
npm start
```

Se a porta estiver ocupada, escolha outra antes de iniciar:

```powershell
$env:PORT = '3001'
npm start
```

## Jogar

- O menu principal separa **Singleplayer**, **Multiplayer** e **Instruções**.
- Em **Singleplayer**, digite o nome do robô, escolha personagem, dificuldade e modo. Estão disponíveis Centopeia, Esqueletos, Golem Mecânico, Campanha, Batalha final e Ettin.
- Em **Multiplayer**, escolha **Entrar em sala** ou **Criar sala**. Ao criar, configure nome, modo e multiplicadores de dificuldade antes de abrir a sala. Ao entrar, escolha seu personagem e selecione uma sala listada. A lista se atualiza quando alguém cria, entra ou sai. Há suporte para até **8 jogadores**.
- Cada jogador escolhe **Artilheiro** para tiros rápidos, **Fieldfighter** para um combo corpo a corpo de dois golpes em cone, ou **Arachondroid** para disparar laser. O personagem pode ser trocado na sala de espera.
- O criador espera os amigos entrarem e usa **Iniciar partida**. Todos entram na mesma partida cooperativa, com vida individual e dano compartilhado aos inimigos.
- Um jogador abatido continua acompanhando a equipe. A derrota acontece quando todos são abatidos; a vitória é compartilhada.

### Batalha final

A campanha termina com uma quarta fase, após derrotar o Golem: **Centopeia, Exército de Esqueletos, Golem Mecânico e Ettin retornam juntos**, com vida restaurada. A arena cresce de **64 para 112 unidades de diâmetro**, oferecendo aproximadamente três vezes a área. Os limites de movimento, a borda, a floresta e a câmera acompanham a arena maior, inclusive nos computadores dos amigos. Os jogadores vivos recuperam vida antes da batalha; os abatidos continuam acompanhando a equipe.

O botão **Batalha final** (atalho **5**) permite começar diretamente nessa luta. A vitória exige derrotar todos os bosses e concluir as três ondas de esqueletos. O HUD mostra o progresso de cada boss. No multiplayer, a configuração de dificuldade da sala vale também para essa fase.

### Dificuldade dos bosses

Antes de clicar em **Criar sala**, use **Configuração de dificuldade do boss** para definir separadamente os multiplicadores de vida, velocidade e frequência de ataques. Cada campo aceita valores entre **0,25 e 10**; **1×** equivale ao atributo original.

A opção **Multiplicar também pelo número de jogadores** usa o número de participantes presentes no início. Desmarque para manter os valores fixos, independentemente do tamanho da equipe. Todos veem a configuração na sala de espera. As escolhas ficam salvas naquela sala e valem para a partida inteira.

Exemplo: vida **3×**, velocidade **0,5×** e ataques **1,25×**, com a opção desmarcada, produzem um boss com o triplo da vida, metade da velocidade e ataques 25% mais frequentes.

O padrão continua sendo **2× em cada campo, multiplicado pelo número de jogadores**:

| Jogadores | Vida do boss | Velocidade de movimento | Frequência de ataques |
| --- | --- | --- | --- |
| 1 | 2× | 2× | 2× |
| 2 | 4× | 4× | 4× |
| 3 | 6× | 6× | 6× |
| 4 | 8× | 8× | 8× |
| 8 | 16× | 16× | 16× |

Essas configurações valem para todos os bosses e para as fases da campanha. No exército, o multiplicador de vida vale para cada esqueleto. Os atributos dos jogadores permanecem iguais aos originais: 100 de vida, velocidade 9 e intervalo de tiros de 0,13 segundo. A dificuldade fica fixa durante a partida se alguém sair. Salas em partida não aceitam novas entradas.

### Ettin — Thomas DR

O botão **Ettin** (atalho **6**) inicia uma luta independente, solo ou em grupo, usando o OBJ e as cores de **personagem/Ettin by Thomas DR - dcintbXV5iA.zip**. O boss usa animações predefinidas de machado, sem ragdoll: golpe vertical, varredura lateral e golpe com os dois machados. O combo alterna os três golpes e causa dano em cones de **110°**, com alcance de **8 unidades** nos dois primeiros e **10** no último. Um impacto pode acertar vários jogadores à frente; quem estiver atrás, fora do cone ou fora de alcance não recebe dano. O cone no chão indica a área do golpe. Saltos, dash e gritos continuam disponíveis. Após quatro parries bem-sucedidos, o Ettin sofre stagger por **6,5 segundos**, interrompe o ataque e recebe **60% mais dano**.

Cada especial válido (**F**, a ultimate do jogo) faz uma única rolagem de **30%** para provocar um salto na posição do jogador que o usou. Se estiver atacando, o Ettin guarda o alvo para saltar após concluir o ataque. As animações interpolam poses predefinidas, mantêm os machados presos às mãos e voltam à posição original ao terminar cada golpe. O dano coincide com o momento do impacto na animação. O criador da sala simula o combate e envia os movimentos aos convidados.

Cada acerto que tira vida de um jogador acrescenta **10 pontos de rage**; parry, invulnerabilidade e jogadores abatidos não carregam a barra. Ao chegar a **100**, o Ettin dobra a frequência de ataques até o fim da luta. A barra fica vermelha e indica **ATAQUES 2×**. A rage e as animações são sincronizadas em multiplayer. Os multiplicadores da sala também valem para o Ettin e o bônus de rage multiplica a frequência configurada. Para regenerar o modelo: `python scripts/convert-ettin.py`. Para validar a luta: `npm run test:browser -- --ettin`.

O Ettin persegue a **9,2 unidades por segundo**, com aceleração e giro suaves, e corre 12% mais rápido em rage. Durante a preparação, execução e recuperação dos golpes ele continua avançando, mas em ritmo reduzido. Na dificuldade 1×, prepara o machado em **0,52 segundo**, executa cada golpe em **0,48 segundo** e encadeia os três ataques em aproximadamente **2,5 segundos**. A corrida anima tronco, braços, cabeças, joelhos e pés; os golpes usam antecipação, rotação do corpo e recuperação gradual. Rastros luminosos acompanham as lâminas, e impactos e aterrissagens produzem partículas e ondas no chão. Os efeitos também aparecem para os convidados da sala.

## Controles

O **Fieldfighter** ataca com mouse esquerdo ou J: um combo de dois impactos, separados por 0,28 segundo, num cone de 108° à frente, com alcance de 4,8 unidades. O combo começa na direção da mira e mantém essa direção durante os dois golpes. Segurar o ataque repete o combo a cada 0,85 segundo. Cada impacto causa 160 de dano aos esqueletos/voadores, 260 à centopeia e 240 ao golem antes da resistência da armadura. Cada impacto desconta vida da centopeia uma única vez, mesmo se alcançar vários segmentos. Inimigos atrás ou fora do cone não são atingidos.

O **Arachondroid** usa o OBJ e a paleta originais de **personagem/Arachnodroid.zip**, convertidos pela mesma técnica de triângulos compactados em base36. O corpo e as quatro pernas possuem pivôs para animação. Segure o mouse esquerdo ou J para emitir um **laser contínuo**, com alcance de 42 unidades, que acerta o primeiro inimigo na linha da mira. Enquanto dispara, a velocidade de movimento cai de 9 para **4,5** e volta ao normal ao soltar o ataque. O dano é proporcional ao tempo de contato (aproximadamente 127 por segundo à centopeia e 145 aos demais inimigos, antes da armadura do golem), independentemente da taxa de quadros. Para regenerar: `python scripts/convert-arachnodroid.py`.

Todos os personagens podem usar **Shift ou Q** para ativar os propulsores. O impulso inicial dura 0,18 segundo, gasta **25% do combustível** e concede breve invulnerabilidade. Manter a tecla pressionada prolonga o deslocamento em alta velocidade e consome 12% por segundo; após 0,7 segundo sem boost, o tanque regenera 20% por segundo. A direção pode ser corrigida durante o deslizamento. Durante o boost, o corpo e os membros assumem suavemente uma pose de deslizamento orientada pela direção do movimento. O Arachondroid emite partículas nos quatro pés; os bípedes usam propulsores nos pés e ombros. O medidor na tela e o estado do boost são sincronizados em multiplayer.

Pressione **F** para usar o especial do personagem. O indicador mostra quando está pronto e a recarga restante:

| Personagem | Especial | Recarga |
| --- | --- | --- |
| Artilheiro | Saraivada de seis mísseis na direção da mira; cada explosão causa 80 de dano aos inimigos próximos, antes da armadura do golem. | 8 segundos |
| Fieldfighter | Avanço de 10,88 unidades em linha reta na direção da mira, causando 240 de dano a cada inimigo no caminho uma única vez, antes da armadura. Não pode mudar de direção durante o avanço. | 6 segundos |
| Arachondroid | Megalaser por 1,4 segundo, com alcance de 55 unidades e 240 de dano por segundo, atravessando inimigos. A posição e a direção ficam travadas; movimento, pulo, dash e empurrões não deslocam o personagem durante o disparo. | 10 segundos |

Os especiais funcionam no solo e na rede. Cada jogador tem sua própria recarga, validada pelo criador da sala. O dash comum continua disponível pela tecla Shift/Q fora dos especiais.

O modelo 3D do Fieldfighter vem de **personagem/FieldFighter.zip**. O OBJ e a paleta PNG originais são convertidos para triângulos compactados em base36 com cores por vértice, como o personagem antigo. A superfície é dividida em corpo, dois braços e duas pernas, com pivôs mapeados para as animações de andar, pular, golpear e fazer parry. A geometria compacta usa precisão de 0,05 unidade e é compartilhada entre os jogadores da rede. Para regenerar o modelo após substituir o ZIP:

```powershell
python scripts/convert-fieldfighter.py
```

WASD ou setas: mover em relação à direção da câmera. Mova o mouse para girar a câmera em terceira pessoa e mirar livremente para cima, para baixo e para os lados; use a roda para aproximar ou afastar. Pressione **P** para alternar entre terceira pessoa e câmera isométrica. Espaço: pular. Mouse esquerdo segurado ou J: atacar. Pressione Shift ou Q para gastar 25% de combustível no impulso inicial e mantenha pressionado para deslizar rapidamente, consumindo combustível aos poucos. O combustível volta a carregar depois que o boost termina. Mouse direito ou E: parry. O campo de força protege em **todas as direções** durante sua curta janela de ativação. M: voltar ao menu. R: recarregar para jogar novamente; em grupo, é necessário entrar em uma nova sala.

Durante o combate, uma mira em pixel art fica no centro da tela, acima do personagem, pulsando e girando. O personagem vira para a direção horizontal do disparo, e a arma acompanha a altura da mira, tanto no modo solo quanto em grupo.

Os bosses, esqueletos e voadores reavaliam o alvo a cada 2–4 segundos. Começam pelo jogador vivo mais próximo e alternam entre jogadores próximos, dando mais chance aos que estão a menor distância. Jogadores abatidos são descartados imediatamente.

Os mobs voadores da centopeia nascem e permanecem a **1,3 unidade do chão**, na altura dos tiros comuns, inclusive durante suas investidas. Assim podem ser acertados com tiros horizontais.

Quando o alvo está a mais de **15 unidades**, a Centopeia pode mergulhar e avançar sob o chão em alta velocidade. Partículas e um rastro de terra indicam sua trajetória. Ao emergir perto do alvo, causa **30 de dano** num raio de 4,2 unidades e lança os jogadores atingidos para longe e para o alto. O ataque e o rastro são sincronizados no multiplayer.

Ao morrer, jogadores e inimigos se despedaçam em cubinhos com as cores do modelo. Os fragmentos recebem impulso e rotação, sofrem gravidade, quicam no chão e desaparecem após alguns segundos. O criador da sala simula a física e envia os movimentos aos amigos. A explosão de um jogador ocorre uma única vez; ele continua acompanhando a equipe após ser abatido.

Ao chegar a **20% da vida**, o **boss 3 (Golem Mecânico)** entra em desespero: lança continuamente um míssil teleguiado para cada jogador vivo a cada 0,32 segundo, ajustado pela frequência de ataques da sala, até morrer. Cada míssil mantém seu alvo enquanto ele estiver vivo. Dash e parry continuam disponíveis; mísseis refletidos atingem o golem. Os projéteis expiram e há um limite de mísseis simultâneos para manter a partida funcionando na rede.

## Como a rede funciona

O servidor reúne e lista as salas criadas nele. Todos devem usar o endereço desse servidor; não há busca automática de servidores diferentes na rede. O navegador do criador simula a arena e distribui o estado aos amigos. Mantenha a aba do criador visível e o computador ativo para a partida continuar normalmente. Se o criador sair, a sala é encerrada e os outros recebem um aviso. Salas diferentes funcionam de forma independente.

Se um amigo não conseguir abrir o jogo, confira o endereço exibido no terminal, o firewall para a porta escolhida e se o roteador tem isolamento de dispositivos/rede de convidados ativado.

## Verificação

```powershell
npm test
npm run test:browser
```

Os testes verificam as salas, permissões do criador, controles e sincronização entre dois navegadores, sala cheia com oito conexões, todos os bosses, campanha, dificuldade, dano, vitória, saída do criador, parry e modo solo. O teste de navegador usa Chromium do Playwright ou Microsoft Edge instalado no Windows.

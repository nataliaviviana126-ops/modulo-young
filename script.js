/* ── DATA ── */
const MATS = {
  acero: {
    name: 'Acero',
    E: 200,
    yield: 250,
    maxStrain: 0.0024
  },

  aluminio: {
    name: 'Aluminio',
    E: 70,
    yield: 270,
    maxStrain: 0.005
  },

  cobre: {
    name: 'Cobre',
    E: 110,
    yield: 210,
    maxStrain: 0.003
  },

  titanio: {
    name: 'Titanio',
    E: 115,
    yield: 880,
    maxStrain: 0.012
  },

  hierro: {
    name: 'Hierro fundido',
    E: 170,
    yield: 130,
    maxStrain: 0.0018
  },
};

const getMat = () =>
  MATS[document.getElementById('matSel').value];

/* ── CAMBIO DE MATERIAL ── */
function onMatChange() {

  const m = getMat();

  document.getElementById('aName').textContent =
    m.name;

  document.getElementById('aYield').textContent =
    m.yield + ' MPa';

  document.getElementById('outEref').textContent =
    m.E + ' GPa';

  document.getElementById('graphTag').textContent =
    m.name;

  updateChart();

  ['outSigma', 'outEps', 'outE']
    .forEach(id => {
      document.getElementById(id).textContent = '—';
    });
}

/* ── FORMATO DE UNIDADES ── */
function fmtPa(v) {

  const a = Math.abs(v);

  if (a >= 1e9) {
    return (v / 1e9).toFixed(2) + ' GPa';
  }

  if (a >= 1e6) {
    return (v / 1e6).toFixed(2) + ' MPa';
  }

  if (a >= 1e3) {
    return (v / 1e3).toFixed(2) + ' kPa';
  }

  return v.toFixed(2) + ' Pa';
}

/* ── CÁLCULO ── */
function calculate() {

  const F =
    parseFloat(document.getElementById('inF').value) || 0;

  const A =
    parseFloat(document.getElementById('inA').value) || 1;

  const DL =
    parseFloat(document.getElementById('inDL').value) || 0;

  const L =
    parseFloat(document.getElementById('inL').value) || 1;

  const sigma = F / A;

  const epsilon = DL / L;

  const E_calc =
    epsilon !== 0
      ? sigma / epsilon
      : 0;

  document.getElementById('outSigma').textContent =
    fmtPa(sigma);

  document.getElementById('outEps').textContent =
    epsilon.toExponential(3);

  document.getElementById('outE').textContent =
    fmtPa(E_calc);

  updateChart();
}

/* ── CHART ── */
let chart;

/* ── CONSTRUIR PUNTOS ── */
function buildPoints(m) {

  const E_Pa = m.E * 1e9;

  const yPa = m.yield * 1e6;

  const yStrain = yPa / E_Pa;

  const maxStr = m.maxStrain;

  const pts = [];

  const total = 1500;

  const splitI = 100;

  for (let i = 0; i <= total; i++) {

    let e;
    let s;

    if (i <= splitI) {

      const t = i / splitI;

      e = yStrain * t;

      s = E_Pa * e / 1e6;

    } else {

      const t =
        (i - splitI) / (total - splitI);

      e =
        yStrain +
        (maxStr - yStrain) * t;

      const peak = m.yield * 1.25;

      const shape = Math.pow(t, 0.28);

      const neck =
        1 - 0.12 * Math.pow(t, 3);

      s =
        m.yield +
        (peak - m.yield) *
        shape *
        neck;
    }

    pts.push({
      x: +(e * 100).toFixed(6),
      y: +s.toFixed(4),
      i
    });
  }

  const yieldX =
    +(yStrain * 100).toFixed(6);

  const elastic =
    pts.slice(0, splitI + 1);

  const plastic =
    pts.slice(splitI);

  return {
    elastic,
    plastic,
    yieldX,
    yieldY: m.yield
  };
}

/* ── ACTUALIZAR GRÁFICA ── */
function updateChart() {

  const m = getMat();

  const {
    elastic,
    plastic,
    yieldX,
    yieldY
  } = buildPoints(m);

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(
    document.getElementById('myChart'),
    {
      type: 'line',

      data: {
        datasets: [

          {
            label: 'Zona segura',

            data: elastic,

            borderColor: '#4a6cf7',

            borderWidth: 2.5,

            pointRadius: 0,

            cubicInterpolationMode: 'monotone',

            tension: 0.4,

            fill: false,

            parsing: false,
          },

          {
            label: 'Zona plástica',

            data: plastic,

            borderColor: '#4a5580',

            borderWidth: 2.5,

            pointRadius: 0,

            cubicInterpolationMode: 'monotone',

            tension: 0.4,

            fill: false,

            parsing: false,
          },

        ]
      },

      options: {

        responsive: true,

        maintainAspectRatio: false,

        animation: {
          duration: 500
        },

        scales: {

          x: {

            type: 'linear',

            ticks: {

              color: '#6b7280',

              maxTicksLimit: 7,

              callback: v =>
                v.toFixed(2) + '%'
            },

            grid: {
              color: '#1a1d2e'
            },

            title: {
              display: true,
              text: 'Estiramiento (%)',
              color: '#8892a4',
              font: {
                size: 12
              }
            }
          },

          y: {

            ticks: {
              color: '#6b7280'
            },

            grid: {
              color: '#1a1d2e'
            },

            title: {
              display: true,
              text: 'Fuerza por área (MPa)',
              color: '#8892a4',
              font: {
                size: 12
              }
            }
          }
        },

        plugins: {

          legend: {
            display: false
          },

          tooltip: {
            callbacks: {
              label: ctx =>
                ` ${ctx.parsed.y.toFixed(1)} MPa`
            }
          }
        }
      },

      plugins: [

        {
          id: 'yieldLine',

          afterDraw(ch) {

            const {
              ctx,
              scales
            } = ch;

            if (!scales.x || !scales.y) {
              return;
            }

            const xPx =
              scales.x.getPixelForValue(yieldX);

            const yTop = scales.y.top;

            const yBot = scales.y.bottom;

            ctx.save();

            ctx.setLineDash([5, 4]);

            ctx.strokeStyle = '#f5a623';

            ctx.lineWidth = 1.5;

            ctx.beginPath();

            ctx.moveTo(xPx, yTop);

            ctx.lineTo(xPx, yBot);

            ctx.stroke();

            ctx.setLineDash([]);

            ctx.fillStyle = '#f5a623';

            ctx.font = '11px Inter,sans-serif';

            ctx.fillText(
              'Punto de quiebre',
              xPx - 52,
              yTop + 14
            );

            const yPx =
              scales.y.getPixelForValue(yieldY);

            ctx.beginPath();

            ctx.moveTo(xPx, yPx - 6);

            ctx.lineTo(xPx + 5, yPx);

            ctx.lineTo(xPx, yPx + 6);

            ctx.lineTo(xPx - 5, yPx);

            ctx.closePath();

            ctx.fill();

            ctx.restore();
          }
        }
      ]
    }
  );
}

/* ── TARJETAS ── */
const CARDS = [

  {
    tag: '¿Qué es?',
    tagC: '#3b4fc8',
    emoji: '🧱',

    q: '¿Qué significa el Módulo de Young?',

    a: 'Es un número que indica qué tan difícil es estirar o comprimir un material.'
  },

  {
    tag: 'Ejemplo simple',
    tagC: '#0d6b3a',
    emoji: '🌿',

    q: '¿Cuál es la idea básica?',

    a: 'Si necesitas mucha fuerza para estirarlo poco, tiene un módulo alto.'
  },

  {
    tag: 'Recuperación',
    tagC: '#1a5276',
    emoji: '🔄',

    q: '¿El material vuelve a su forma original?',

    a: 'Sí, mientras no supere el límite elástico.'
  },

  {
    tag: '¿Para qué sirve?',
    tagC: '#4a235a',
    emoji: '🏗️',

    q: '¿Para qué usan esto los ingenieros?',

    a: 'Para diseñar estructuras seguras.'
  },

  {
    tag: 'Experimento',
    tagC: '#5d4037',
    emoji: '🔬',

    q: '¿Cómo se mide en laboratorio?',

    a: 'Con máquinas de tracción que estiran el material.'
  },

  {
    tag: 'Temperatura',
    tagC: '#1b5e20',
    emoji: '🌡️',

    q: '¿La temperatura cambia E?',

    a: 'Sí. El calor suele volver más blandos los metales.'
  },

  {
    tag: 'Unidades',
    tagC: '#7b3f00',
    emoji: '📏',

    q: '¿En qué unidades se mide?',

    a: 'En Pascales o GPa.'
  },

  {
    tag: 'Récord',
    tagC: '#1a237e',
    emoji: '💎',

    q: '¿Cuál es el material más rígido?',

    a: 'El diamante.'
  },
];

/* ── CREAR TARJETAS ── */
function buildCards() {

  document.getElementById('cgrid').innerHTML =
    CARDS.map(c => `

      <div class="fcard"
           onclick="this.classList.toggle('flipped')">

        <div class="finner">

          <div class="ffront">

            <span class="ftag"
                  style="color:${c.tagC};
                  border-color:${c.tagC};">

                  ${c.tag}

            </span>

            <div class="femoji">
              ${c.emoji}
            </div>

            <div class="fq">
              ${c.q}
            </div>

            <div class="fhint">
              Toca para ver la respuesta
            </div>

          </div>

          <div class="fback">
            <p>${c.a}</p>
          </div>

        </div>

      </div>

    `).join('');
}

/* ── INICIO ── */
buildCards();

onMatChange();

calculate();

(() => {
  if (window.__COSPLAY_ACHIEVEMENT_SOCIAL_CARD__) return;
  window.__COSPLAY_ACHIEVEMENT_SOCIAL_CARD__ = true;

  const CARD_WIDTH = 1080;
  const CARD_HEIGHT = 1350;
  const $ = (id) => document.getElementById(id);

  const clean = (value, fallback = '') => String(value || '').replace(/\s+/g, ' ').trim() || fallback;
  const slugify = (value) => clean(value, 'conquista')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'conquista';

  const roundedRect = (ctx, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  };

  const drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 6) => {
    const words = clean(text).split(' ').filter(Boolean);
    if (!words.length) return y;
    const lines = [];
    let line = '';

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);

    const visible = lines.slice(0, maxLines);
    if (lines.length > maxLines && visible.length) {
      let last = visible[visible.length - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      visible[visible.length - 1] = `${last}…`;
    }

    visible.forEach((item, index) => ctx.fillText(item, x, y + (index * lineHeight)));
    return y + (visible.length * lineHeight);
  };

  const getCardData = (card) => {
    const owner = clean($('achievementOwnerName')?.textContent, 'Participante');
    const characterLine = clean($('achievementOwnerCharacter')?.textContent);
    const title = clean(card.querySelector('h2')?.textContent, 'Conquista CosplayChess');
    const icon = clean(card.querySelector('.social-achievement-card-icon')?.textContent, '🏆');
    const tier = clean(card.querySelector('.social-achievement-badge')?.textContent, 'CONQUISTA');
    const paragraphs = [...card.querySelectorAll('p')].map((el) => clean(el.textContent)).filter(Boolean);
    const description = paragraphs.find((text) => !/^como desbloquear:/i.test(text)) || 'Conquista desbloqueada no CosplayChess.';
    const criteria = paragraphs.find((text) => /^como desbloquear:/i.test(text)) || '';
    const meta = [...card.querySelectorAll('.social-achievement-meta > *')]
      .map((el) => clean(el.textContent))
      .filter(Boolean);
    return { owner, characterLine, title, icon, tier, description, criteria, meta };
  };

  const makeCanvas = (data) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponível.');

    const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    bg.addColorStop(0, '#090a12');
    bg.addColorStop(0.55, '#121522');
    bg.addColorStop(1, '#07080d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    const glowGold = ctx.createRadialGradient(860, 150, 30, 860, 150, 560);
    glowGold.addColorStop(0, 'rgba(224,190,119,.24)');
    glowGold.addColorStop(1, 'rgba(224,190,119,0)');
    ctx.fillStyle = glowGold;
    ctx.fillRect(0, 0, CARD_WIDTH, 650);

    const glowBlue = ctx.createRadialGradient(130, 1190, 20, 130, 1190, 520);
    glowBlue.addColorStop(0, 'rgba(111,143,232,.16)');
    glowBlue.addColorStop(1, 'rgba(111,143,232,0)');
    ctx.fillStyle = glowBlue;
    ctx.fillRect(0, 760, 700, 590);

    ctx.strokeStyle = 'rgba(224,190,119,.28)';
    ctx.lineWidth = 2;
    roundedRect(ctx, 54, 54, 972, 1242, 38);
    ctx.stroke();

    ctx.fillStyle = '#e0be77';
    ctx.font = '900 30px Arial, sans-serif';
    ctx.fillText('COSPLAYCHESS', 92, 122);
    ctx.fillStyle = '#8d8fa1';
    ctx.font = '700 18px Arial, sans-serif';
    ctx.fillText('CONQUISTA DESBLOQUEADA', 92, 158);

    ctx.fillStyle = 'rgba(224,190,119,.10)';
    roundedRect(ctx, 92, 206, 896, 252, 34);
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,190,119,.20)';
    ctx.stroke();

    ctx.fillStyle = '#0c0e16';
    roundedRect(ctx, 124, 244, 168, 168, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(224,190,119,.34)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '82px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillStyle = '#f7dc98';
    ctx.fillText(data.icon, 208, 328);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#c7a95e';
    ctx.font = '900 18px Arial, sans-serif';
    ctx.fillText(data.tier.toUpperCase(), 330, 267);

    ctx.fillStyle = '#f5f0f8';
    ctx.font = '900 43px Arial, sans-serif';
    drawWrappedText(ctx, data.title, 330, 325, 610, 51, 3);

    ctx.fillStyle = '#9da0af';
    ctx.font = '600 21px Arial, sans-serif';
    ctx.fillText(`de ${data.owner}`, 330, 412);

    ctx.fillStyle = '#f0edf4';
    ctx.font = '800 26px Arial, sans-serif';
    ctx.fillText('A CONQUISTA', 92, 540);

    ctx.fillStyle = '#b5b3bf';
    ctx.font = '500 27px Arial, sans-serif';
    let cursorY = drawWrappedText(ctx, data.description, 92, 596, 896, 39, 6) + 30;

    if (data.criteria) {
      ctx.fillStyle = 'rgba(224,190,119,.08)';
      roundedRect(ctx, 92, cursorY, 896, 122, 24);
      ctx.fill();
      ctx.fillStyle = '#cfb872';
      ctx.font = '700 21px Arial, sans-serif';
      drawWrappedText(ctx, data.criteria, 122, cursorY + 44, 836, 31, 2);
      cursorY += 152;
    }

    const detailsY = Math.max(cursorY + 18, 862);
    ctx.fillStyle = '#f0edf4';
    ctx.font = '800 23px Arial, sans-serif';
    ctx.fillText('REGISTRO OFICIAL', 92, detailsY);

    ctx.fillStyle = 'rgba(255,255,255,.035)';
    roundedRect(ctx, 92, detailsY + 28, 896, 172, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.stroke();

    ctx.fillStyle = '#c9c6d0';
    ctx.font = '600 22px Arial, sans-serif';
    const details = data.meta.length ? data.meta : ['Desbloqueada em uma partida oficial do CosplayChess.'];
    details.slice(0, 3).forEach((line, index) => {
      drawWrappedText(ctx, line, 122, detailsY + 72 + (index * 43), 826, 31, 1);
    });

    if (data.characterLine) {
      ctx.fillStyle = '#858896';
      ctx.font = '500 19px Arial, sans-serif';
      drawWrappedText(ctx, data.characterLine, 92, 1135, 896, 29, 2);
    }

    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.moveTo(92, 1214);
    ctx.lineTo(988, 1214);
    ctx.stroke();

    ctx.fillStyle = '#e0be77';
    ctx.font = '800 20px Arial, sans-serif';
    ctx.fillText('MINHA JORNADA NO TABULEIRO', 92, 1256);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#777b88';
    ctx.font = '600 18px Arial, sans-serif';
    ctx.fillText('cosplaychess-nine.vercel.app', 988, 1256);
    ctx.textAlign = 'left';

    return canvas;
  };

  const canvasToBlob = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível gerar o card.')), 'image/png', 1);
  });

  const downloadBlob = (blob, filename) => {
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  };

  const canShareFile = (file) => {
    if (!navigator.share || !navigator.canShare) return false;
    try {
      return navigator.canShare({ files: [file] });
    } catch (_) {
      return false;
    }
  };

  const shareCard = async (card, button) => {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'GERANDO CARD…';
    try {
      const data = getCardData(card);
      const canvas = makeCanvas(data);
      const blob = await canvasToBlob(canvas);
      const filename = `cosplaychess-${slugify(data.title)}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      const text = `${data.owner} desbloqueou “${data.title}” no CosplayChess! ${data.icon}`;

      if (canShareFile(file)) {
        await navigator.share({
          title: `${data.title} — CosplayChess`,
          text,
          files: [file]
        });
        return;
      }

      downloadBlob(blob, filename);
      try { await navigator.clipboard?.writeText(text); } catch (_) {}
      alert('Card 1080×1350 gerado. No computador ele foi salvo como PNG; no celular compatível, o botão abre o compartilhamento direto para apps como Instagram, WhatsApp e outros.');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.warn('[CosplayChess] Falha ao gerar card de conquista:', error);
        alert('Não foi possível gerar o card desta conquista agora.');
      }
    } finally {
      button.disabled = false;
      button.textContent = original || '↗ COMPARTILHAR';
    }
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('.social-achievement-actions button');
    const card = button?.closest?.('.social-achievement-card.unlocked');
    if (!button || !card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    shareCard(card, button);
  }, true);
})();

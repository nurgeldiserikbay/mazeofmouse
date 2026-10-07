<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useAudio } from '@/composables/useAudio'
import { PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'

import UiButton from '@/components/UiButton.vue'
import StartModal from '@/components/StartModal.vue'
import HistoryBlock from '@/components/HistoryBlock.vue'
import OtherGames from '@/components/OtherGames.vue'
import OtherGamesIcon from '@/components/OtherGamesIcon.vue'

const {
	play,
	stop,
	toggleMusic,
	toggleAudio,
	playAudio,
	musicActive,
	audioActive,
} = useAudio()

const pageStore = usePageStore()
const gameStore = useGameStore()

const isStart = ref(false)
const isHistory = ref(false)
const isOtherGames = ref(false)

/**
 * Незаконченный забег, к которому можно вернуться.
 *
 * Ноль означает «продолжать нечего»: так его оставляет проигрыш и начало новой
 * игры. Выход в меню, наоборот, прогресс сохраняет — ради этого кнопка и есть.
 */
const canContinue = computed(() => gameStore.currentLevel > 0)

/** Уровень показываем человеку, а не индексом с нуля. */
const continueLevel = computed(() => gameStore.currentLevel + 1)

// Мимо StartModal: имя уже сохранено в прошлый заход, а спрашивать его снова
// значило бы начать новую партию.
function continueGame() {
	playAudio('click')
	pageStore.routeTo(PAGES.PLAYGROUND)
}

// Новая игра идёт через модалку с именем, и она же сбрасывает прогресс.
function openNewGame() {
	playAudio('click')
	isStart.value = true
}

onMounted(() => {
	play('menuMusic')
})

onBeforeUnmount(() => {
	stop('menuMusic')
})
</script>

<template>
	<div class="page start-page">
		<div class="start-page__head">
			<div class="container">
				<button
					:class="{ active: musicActive }"
					class="start-page__music"
					@click="toggleMusic(), playAudio('click')"
				></button>
				<div class="start-page__right">
					<button
						:class="{ active: audioActive }"
						class="start-page__sound"
						@click="toggleAudio(), playAudio('click')"
					></button>
					<!-- Вход в «Другие игры». Рядом с кнопкой звука и с той же
					     приглушённостью: раздел не должен спорить за внимание с
					     кнопкой Start. -->
					<button
						class="start-page__games"
						:aria-label="$t('otherGames')"
						@click=";(isOtherGames = true), playAudio('click')"
					>
						<OtherGamesIcon />
					</button>
				</div>
			</div>
		</div>

		<!-- Сад во весь экран, позади колонки меню: колонка узкая (до 480px),
		     а фон должен закрывать и поля по бокам на планшете. -->
		<div class="start-page__bg" aria-hidden="true"></div>

		<div class="start-page__logo">
			<img src="@/assets/img/v2/cat-peek.webp" alt="" class="cat" />
			<img src="@/assets/img/v2/logo.webp" alt="Maze of Mouse" class="logo" />
		</div>

		<div class="start-page__stage" aria-hidden="true">
			<img src="@/assets/img/v2/mouse-full.webp" alt="" class="mouse" />
		</div>

		<div class="start-page__btns">
			<!--
				Главная кнопка одна: незаконченный забег она продолжает, а если
				продолжать нечего — начинает новый. Что именно продолжится,
				говорит плашка под кнопкой.
			-->
			<UiButton
				:width="270"
				@click="canContinue ? continueGame() : openNewGame()"
			>
				<template #icon>
					<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
				</template>
				{{ $t('start') }}
			</UiButton>

			<div v-if="canContinue" class="start-page__hint">
				{{ $t('continueFrom', { level: continueLevel }) }}
			</div>

			<!-- Начать сначала можно только когда есть что терять. -->
			<UiButton
				v-if="canContinue"
				:bg="'grey'"
				:width="220"
				:size="'small'"
				@click="openNewGame"
			>
				<template #icon>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v5h5" /></svg>
				</template>
				{{ $t('restart') }}
			</UiButton>

			<UiButton
				:bg="'grey'"
				:width="220"
				:size="'small'"
				@click=";(isHistory = true), playAudio('click')"
			>
				<template #icon>
					<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="12" width="5" height="9" rx="1.5" /><rect x="9.5" y="4" width="5" height="17" rx="1.5" /><rect x="16" y="8" width="5" height="13" rx="1.5" /></svg>
				</template>
				{{ $t('history') }}
			</UiButton>
		</div>

		<a
			href="https://docs.google.com/document/d/1DOfHLx0DSwtIGCbjJMWeCGWkfBDVH26vuCuaNO0CO4Q/edit?usp=sharing"
			target="_blank"
			class="privacy"
			>{{ $t('privacyPolicy') }}</a
		>

		<StartModal
			v-if="isStart"
			@close=";(isStart = false), playAudio('click')"
		/>
		<HistoryBlock
			v-if="isHistory"
			@close=";(isHistory = false), playAudio('click')"
		/>
		<OtherGames
			v-if="isOtherGames"
			@close=";(isOtherGames = false), playAudio('click')"
		/>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.start-page {
	position: relative;
	padding-top: 92px;
	padding-bottom: 18px;
	height: 100dvh;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	max-width: 480px;
	margin: 0 auto;

	&__bg {
		position: fixed;
		inset: 0;
		z-index: -1;
		background: #8fd15a url('@/assets/img/v2/menu-bg.webp') center bottom / cover
			no-repeat;
	}

	&__head {
		position: absolute;
		top: 10px;
		width: 100%;
		z-index: 2;

		.container {
			display: flex;
			justify-content: space-between;
		}

		button {
			width: 46px;
			height: 46px;
			border-radius: 8px;
			border: none;
			outline: none;
			cursor: pointer;
			opacity: 0.55;
			transition: 0.3s linear;

			&.active {
				opacity: 1;
			}
		}
	}

	&__music {
		background-image: url('@/assets/img/music.png');
		background-size: cover;
		background-color: transparent;
	}

	&__sound {
		background-image: url('@/assets/img/sound.png');
		background-size: cover;
		background-color: transparent;
	}

	/* Звук и «Другие игры» держатся вместе у правого края: иначе
	   space-between растащил бы три кнопки по краям и середине. */
	&__right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* Значок на светлом небе: белый без подложки терялся, поэтому у него
	   своя тёмная плашка той же приглушённости, что и раньше. */
	&__games {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #fff;
		background: rgba(40, 70, 20, 0.55) !important;
		border: 2px solid rgba(255, 255, 255, 0.6) !important;

		svg {
			width: 24px;
			height: 24px;
		}
	}

	&__logo {
		position: relative;
		width: min(82vw, 360px);
		margin-top: 10px;

		.logo {
			position: relative;
			display: block;
			width: 100%;
			filter: drop-shadow(0 6px 0 rgba(60, 30, 5, 0.35));
		}

		/* Кот выглядывает из-за вывески: лапы на её верхнем крае. */
		.cat {
			position: absolute;
			right: 0;
			top: -21%;
			width: 32%;
			animation: peek 6s ease-in-out infinite;
		}
	}

	/* Свободное место между логотипом и кнопками занимает мышь у норки. */
	&__stage {
		flex: 1 1 auto;
		min-height: 0;
		width: 100%;
		display: flex;
		align-items: flex-end;
		justify-content: center;

		.mouse {
			width: min(42vw, 190px);
			max-height: 100%;
			object-fit: contain;
			margin: 0 0 6px 18%;
			filter: drop-shadow(0 6px 0 rgba(30, 60, 10, 0.25));
			animation: hop 3.2s ease-in-out infinite;
		}
	}

	&__btns {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding-top: 8px;
	}

	/* Плашка «Лабиринт N»: на пёстром фоне голая подпись не читалась. */
	&__hint {
		margin: -4px 0 2px;
		padding: 4px 14px 5px;
		@include wood(10px);
		font-size: 15px;
		font-weight: 700;
		letter-spacing: 0.5px;
		color: $cream;
		text-align: center;
	}
}

@keyframes peek {
	0%,
	70%,
	100% {
		transform: translateY(0) rotate(0);
	}
	80% {
		transform: translateY(-6%) rotate(-4deg);
	}
	90% {
		transform: translateY(-2%) rotate(3deg);
	}
}

@keyframes hop {
	0%,
	60%,
	100% {
		transform: translateY(0);
	}
	70% {
		transform: translateY(-10px);
	}
	80% {
		transform: translateY(0);
	}
	88% {
		transform: translateY(-4px);
	}
}

.privacy {
	display: block;
	margin: 18px auto 0;
	font-size: 13px;
	font-weight: 700;
	color: #fff4b8;
	text-decoration: none;
	letter-spacing: 2px;
	text-transform: uppercase;
	text-shadow: 0 1px 0 rgba(30, 50, 10, 0.9), 0 0 6px rgba(30, 50, 10, 0.6);
	// Перевод длиннее английского оригинала (ru: «Политика конфиденциальности»),
	// поэтому строке разрешено переноситься и она не может вылезти за экран.
	max-width: 90vw;
	text-align: center;
	line-height: 1.4;
}
</style>

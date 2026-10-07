<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { CUSTOM_NAMES, PAGES } from '@/utils/conts'

import { usePageStore } from '@/store/pageStore'
import { useGameStore } from '@/store/gameStore'
import { randomInt } from '@/pages/game'
import UiButton from '@/components/UiButton.vue'

const pageStore = usePageStore()
const gameStore = useGameStore()

const $emits = defineEmits(['close'])

const name = ref('')

// Вернувшийся игрок видит своё имя, случайное — только у новичка.
onMounted(() => {
	if (gameStore.name) name.value = gameStore.name
	else generateCustomName()
})

function generateCustomName() {
	name.value = CUSTOM_NAMES[randomInt(0, CUSTOM_NAMES.length - 1)]
	saveName()
}

function saveName() {
	if (!name.value) return

	gameStore.setName(name.value)
}

function change(event: Event) {
	const target = event.target as HTMLInputElement

	if (target) {
		if (target.value.length > 12) target.value = target.value.slice(0, 12)
		name.value = target.value
	}
}

async function startGame() {
	saveName()
	await gameStore.loadData()

	// Это всегда НОВЫЙ забег: незаконченный прогресс отсюда сбрасывается, иначе
	// «Играть» молча продолжало бы старую партию — ровно то, что выглядело как
	// баг. Вернуться к незаконченному забегу можно кнопкой «Продолжить» в меню,
	// которая ведёт на игровой экран мимо этой модалки.
	gameStore.currentLevel = 0

	pageStore.routeTo(PAGES.PLAYGROUND)
}
</script>

<template>
	<div class="desc" @click="$emits('close')">
		<div class="desc__in" @click.stop="">
			<div class="desc__title">{{ $t('name') }}</div>
			<img class="desc__mouse" src="@/assets/img/v2/token-mouse.webp" alt="" />
			<input
				:value="name"
				type="text"
				class="desc__input"
				maxlength="12"
				@input="change"
				@keypress.enter="saveName"
			/>
			<UiButton :width="220" @click="startGame">
				<template #icon>
					<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
				</template>
				{{ $t('run') }}
			</UiButton>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

.desc {
	@include modal-shade(1000);

	&__in {
		@include modal-card;
		max-width: 360px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18px;
		padding-top: 40px;
		padding-bottom: 28px;
	}

	&__title {
		@include modal-title;
	}

	&__mouse {
		width: 96px;
		height: 96px;
		filter: drop-shadow(0 4px 0 rgba(90, 50, 15, 0.25));
	}

	&__input {
		width: 100%;
		max-width: 260px;
		box-sizing: border-box;
		padding: 12px 16px;
		border: 2px solid $woodEdge;
		border-radius: 12px;
		outline: none;
		background: #fffaf0;
		box-shadow: inset 0 3px 0 rgba(90, 50, 15, 0.15);
		font-family: $font;
		font-size: 22px;
		font-weight: 700;
		text-align: center;
		color: $ink;

		&:focus {
			border-color: $leafEdge;
		}
	}
}
</style>

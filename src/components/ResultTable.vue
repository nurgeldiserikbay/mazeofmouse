<script lang="ts" setup>
import { onMounted, ref } from 'vue'

import { useGameStore } from '@/store/gameStore'
import { CUSTOM_NAMES } from '@/utils/conts'
import { randomInt } from '@/pages/game'

withDefaults(
	defineProps<{
		result: number
	}>(),
	{}
)

const $emits = defineEmits(['close'])

const gameStore = useGameStore()

const name = ref('')

onMounted(() => {
	if (gameStore.name) name.value = gameStore.name
	else generateCustomName()
})

function generateCustomName() {
	name.value = CUSTOM_NAMES[randomInt(0, CUSTOM_NAMES.length - 1)]
	gameStore.setName(name.value)
}
</script>

<template>
	<div class="result">
		<div class="result__in">
			<div class="result__title">{{ $t('yourScore') }}</div>
			<img class="result__art" src="@/assets/img/v2/cat-caught.webp" alt="" />
			<div class="result__row">
				<span class="result__name">{{ name }}</span>
				<span class="result__score">{{ result }}</span>
			</div>
			<button class="result__btn" :aria-label="'home'" @click="$emits('close')">
				<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.2 2.2 11.6h3V20.5h5.2v-5.6h3.2v5.6h5.2v-8.9h3z" stroke="currentColor" stroke-width="1" stroke-linejoin="round" /></svg>
			</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use '@/assets/common' as *;

/* Проигрыш: кот поймал мышь — смешно, а не страшно; счёт крупно. */
.result {
	@include modal-shade(1000);

	&__in {
		@include modal-card;
		max-width: 340px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
	}

	&__title {
		@include modal-title;
	}

	&__art {
		width: 78%;
		margin-top: -4px;
	}

	&__row {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 16px;
		box-sizing: border-box;
		background: #fffaf0;
		border: 2px solid $creamEdge;
		border-radius: 12px;
		box-shadow: 0 3px 0 $creamEdge;
	}

	&__name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 18px;
		font-weight: 700;
	}

	&__score {
		font-size: 34px;
		font-weight: 900;
		@include outlined($sun, $woodEdge);
	}

	&__btn {
		@include icon-button;
		margin-top: 4px;
	}
}
</style>

<script lang="ts" setup>
import { computed, ref } from 'vue'

/**
 * Родительский гейт перед уходом из приложения.
 *
 * Зачем: это детское приложение под Families Policy, и Google в отказе прямо
 * пишет про «inadvertent clicks from child users». Ссылка на Google Play из
 * кросс-промо уводит ребёнка из игры одним касанием — гейт делает так, что
 * уйти можно только осознанно, взрослым действием.
 *
 * Пример на умножение, а не «нажмите и держите»: последнее ребёнок повторит
 * сразу. Множители от 6 до 12 — взрослому это устный счёт, ребёнку 4–8 лет,
 * на которого рассчитана игра, нет.
 *
 * Переход сделан настоящей ссылкой, а не window.open: Capacitor сам отдаёт
 * внешний адрес системному браузеру — так же, как ссылка на политику
 * конфиденциальности в меню, которая работает именно этим способом. Открывать
 * адрес кодом пришлось бы через отдельный плагин, которого в проекте нет.
 */
defineProps<{
	href: string
	title: string
}>()

const $emits = defineEmits(['close'])

function digit() {
	return 6 + Math.floor(Math.random() * 7)
}

const a = ref(digit())
const b = ref(digit())
const answer = ref('')

const passed = computed(() => Number(answer.value) === a.value * b.value)
/** Ошибку показываем только когда ответ уже полной длины, а не на каждой цифре. */
const wrong = computed(
	() =>
		answer.value.length >= String(a.value * b.value).length && !passed.value
)

/** Пускаем только цифры: клавиатура на Android отдаёт и точку, и минус. */
function onInput(event: Event) {
	const el = event.target as HTMLInputElement
	answer.value = el.value.replace(/\D/g, '').slice(0, 4)
	el.value = answer.value
}
</script>

<template>
	<div class="gate" @click="$emits('close')">
		<div class="gate__in" @click.stop="">
			<div class="gate__title">{{ $t('gateTitle') }}</div>
			<div class="gate__hint">{{ $t('gateHint') }}</div>

			<div class="gate__task">{{ a }} × {{ b }} = ?</div>

			<input
				class="gate__input"
				:class="{ 'gate__input--wrong': wrong }"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				:value="answer"
				@input="onInput"
			/>

			<a
				v-if="passed"
				class="gate__go"
				:href="href"
				target="_blank"
				rel="noopener"
				@click="$emits('close')"
				>{{ $t('gateOpen') }} · {{ title }}</a
			>
			<div v-else class="gate__go gate__go--off">{{ $t('gateOpen') }}</div>

			<button class="gate__close" @click="$emits('close')">
				{{ $t('gateCancel') }}
			</button>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.gate {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1200;
	background: rgba(12, 24, 8, 0.85);
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 20px;
	box-sizing: border-box;

	&__in {
		width: 100%;
		max-width: 340px;
		box-sizing: border-box;
		padding: 60px 30px 40px;
		border-radius: 12px;
		background-image: url('@/assets/img/board.png');
		background-size: 100% 100%;
		text-align: center;
		color: #fff;
	}

	&__title {
		font-size: 20px;
		color: #ffdc16;
		margin-bottom: 6px;
	}

	&__hint {
		font-size: 13px;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.75);
		margin-bottom: 18px;
	}

	&__task {
		font-size: 30px;
		letter-spacing: 2px;
		margin-bottom: 12px;
	}

	&__input {
		width: 120px;
		padding: 10px;
		border-radius: 10px;
		border: 2px solid rgba(0, 0, 0, 0.3);
		outline: none;
		font-family: inherit;
		font-size: 22px;
		text-align: center;
		background: #f4e6c3;
		color: #241806;

		&--wrong {
			border-color: #c0392b;
		}
	}

	&__go {
		display: block;
		margin: 18px auto 0;
		padding: 12px 14px;
		border-radius: 12px;
		font-size: 14px;
		text-decoration: none;
		color: #241806;
		background: #ffdc16;

		&--off {
			opacity: 0.35;
		}
	}

	&__close {
		margin-top: 14px;
		padding: 8px 12px;
		border: none;
		border-radius: 10px;
		background: transparent;
		color: rgba(255, 255, 255, 0.7);
		font-family: inherit;
		font-size: 13px;
		cursor: pointer;
	}
}
</style>

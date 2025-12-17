import { ref } from 'vue'

export const audioList: { [key: string]: string } = {
	catIn: '/sounds/cat-in.mp3',
	catWait: '/sounds/cat-wait.mp3',
	catWin: '/sounds/cat-win.mp3',
	click: '/sounds/click.mp3',
	dir: '/sounds/dir.mp3',
	gameMusic: '/sounds/game-music.mp3',
	menuMusic: '/sounds/menu-music.mp3',
	mouseStart: '/sounds/mouse-start.mp3',
	mouseWin: '/sounds/mouse-win.mp3',
}

const audioActive = ref(true)
const musicActive = ref(true)

let music: { [key: string]: HTMLAudioElement } = {}

export const useAudio = () => {
	function playAudio(audioType: string, anyway: boolean = false) {
		if (!anyway && (!audioActive.value || !audioList[audioType])) return

		if (audioList[audioType]) {
			const audio = new Audio(audioList[audioType])
			audio.play()
		}
	}

	function toggleAudio() {
		audioActive.value = !audioActive.value

		if (music['catWait']) {
			if (audioActive.value) {
				music['catWait'].volume = 0.5
			} else {
				music['catWait'].volume = 0
			}
		}
	}

	function toggleMusic() {
		musicActive.value = !musicActive.value

		if (musicActive.value) {
			Object.entries(music).forEach(([key, audio]) => {
				if (key === 'catWait') return

				audio.volume = 0.5
			})
		} else {
			Object.entries(music).forEach(([key, audio]) => {
				if (key === 'catWait') return
				audio.volume = 0
			})
		}

		playAudio('break')
	}

	function play(name: string) {
		if (!audioList[name]) return
		if (audioActive.value && name === 'catWait') {
			if (music['catWait']) {
				music['catWait'].play()
				music['catWait'].currentTime = 0
			} else {
				music['catWait'] = new Audio(audioList['catWait'])

				music['catWait'].addEventListener(
					'canplaythrough',
					function () {
						this.play()
					},
					false
				)

				music['catWait'].addEventListener(
					'ended',
					function () {
						this.currentTime = 0
						this.play()
					},
					false
				)
				music['catWait'].volume = 0.5
				music['catWait'].play()
			}
		}

		if (musicActive.value) {
			if (music[name]) {
				music[name].play()
				music[name].currentTime = 0
			} else {
				music[name] = new Audio(audioList[name])

				music[name].addEventListener(
					'canplaythrough',
					function () {
						this.play().catch((_: any) => {
							document.addEventListener(
								'click',
								() => {
									this.play()
								},
								{
									once: true,
								}
							)
						})
					},
					false
				)

				music[name].addEventListener(
					'ended',
					function () {
						this.currentTime = 0
						this.play()
					},
					false
				)
				music[name].volume = 0.5
			}
		}
	}

	function stop(name: string) {
		if (music[name]) music[name].pause()
	}

	return {
		audioActive,
		musicActive,
		toggleAudio,
		playAudio,
		toggleMusic,
		play,
		stop,
	}
}

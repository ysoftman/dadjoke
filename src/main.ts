import { type Joke, jokes } from "./jokes";

interface IndexedJoke extends Joke {
	originalIndex: number;
}

const allJokes: IndexedJoke[] = jokes.map((j, i) => ({
	...j,
	originalIndex: i,
}));

const BATCH_SIZE = 20;
let displayJokes: IndexedJoke[] = [...allJokes];
let currentIndex = 0;
let observer: IntersectionObserver | null = null;

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function createCardHtml(joke: IndexedJoke): string {
	return `
    <div class="card" tabindex="0" role="button" aria-expanded="false">
      <div class="card-meta">
        <span class="card-number">#${joke.originalIndex + 1}</span>
      </div>
      <div class="question">${escapeHtml(joke.question)}</div>
      <div class="answer">${escapeHtml(joke.answer)}</div>
      <div class="hint">클릭하면 정답!</div>
    </div>`;
}

function renderBatch(container: HTMLElement) {
	const end = Math.min(currentIndex + BATCH_SIZE, displayJokes.length);
	if (currentIndex >= displayJokes.length) return;

	const fragment = document.createDocumentFragment();
	const temp = document.createElement("div");

	for (let i = currentIndex; i < end; i++) {
		const joke = displayJokes[i];
		if (!joke) continue;
		temp.innerHTML = createCardHtml(joke);
		const card = temp.firstElementChild as HTMLElement;
		const toggle = () => {
			card.classList.toggle("revealed");
			card.setAttribute(
				"aria-expanded",
				String(card.classList.contains("revealed")),
			);
		};
		card.addEventListener("click", toggle);
		card.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				toggle();
			}
		});
		fragment.appendChild(card);
	}

	const sentinel = container.querySelector(".scroll-sentinel");
	if (sentinel) {
		container.insertBefore(fragment, sentinel);
	} else {
		container.appendChild(fragment);
	}

	currentIndex = end;
	updateLoadingIndicator(container);
}

function updateLoadingIndicator(container: HTMLElement) {
	const sentinel = container.querySelector(".scroll-sentinel");
	if (!sentinel) return;

	if (currentIndex >= displayJokes.length) {
		sentinel.textContent = "";
		(sentinel as HTMLElement).style.display = "none";
		if (observer) observer.unobserve(sentinel);
	} else {
		sentinel.textContent = "Loading...";
		(sentinel as HTMLElement).style.display = "block";
	}
}

function setupInfiniteScroll(container: HTMLElement) {
	if (observer) observer.disconnect();

	let sentinel = container.querySelector(".scroll-sentinel");
	if (!sentinel) {
		sentinel = document.createElement("div");
		sentinel.className = "scroll-sentinel";
		(sentinel as HTMLElement).style.textAlign = "center";
		(sentinel as HTMLElement).style.padding = "2rem";
		(sentinel as HTMLElement).style.opacity = "0.7";
		container.appendChild(sentinel);
	}

	observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting && currentIndex < displayJokes.length) {
					renderBatch(container);
				}
			}
		},
		{ rootMargin: "200px" },
	);

	observer.observe(sentinel);
	updateLoadingIndicator(container);
}

function shuffleArray<T>(arr: T[]): T[] {
	const shuffled = [...arr];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i]!, shuffled[j]!] = [shuffled[j]!, shuffled[i]!];
	}
	return shuffled;
}

function shuffle() {
	const searchInput = document.getElementById("search") as HTMLInputElement;
	if (searchInput) searchInput.value = "";
	const countEl = document.getElementById("search-count");
	if (countEl) countEl.textContent = `${allJokes.length}개`;

	resetCards(shuffleArray(allJokes));
	window.scrollTo({ top: 0 });
}

// --- Search ---
function resetCards(filtered: IndexedJoke[]) {
	const container = document.getElementById("cards");
	if (!container) return;

	const sentinel = container.querySelector(".scroll-sentinel");
	container.innerHTML = "";
	if (sentinel) container.appendChild(sentinel);

	displayJokes = filtered;
	currentIndex = 0;

	if (filtered.length === 0) {
		if (sentinel) (sentinel as HTMLElement).textContent = "";
		const msg = document.createElement("div");
		msg.className = "no-results";
		msg.textContent = "검색 결과 없음";
		container.insertBefore(msg, sentinel);
		return;
	}

	renderBatch(container);
	setupInfiniteScroll(container);
}

function search(query: string) {
	const q = query.trim().toLowerCase();
	const countEl = document.getElementById("search-count");

	if (!q) {
		if (countEl) countEl.textContent = `${allJokes.length}개`;
		resetCards([...allJokes]);
		return;
	}

	const filtered = allJokes.filter(
		(j) =>
			j.question.toLowerCase().includes(q) ||
			j.answer.toLowerCase().includes(q),
	);

	if (countEl) countEl.textContent = `${filtered.length}개`;
	resetCards(filtered);
}

// --- Random ---
function showRandom() {
	const idx = Math.floor(Math.random() * allJokes.length);
	const joke = allJokes[idx];
	if (!joke) return;

	const searchInput = document.getElementById("search") as HTMLInputElement;
	if (searchInput) searchInput.value = "";
	const countEl = document.getElementById("search-count");
	if (countEl) countEl.textContent = "1개";

	resetCards([joke]);

	const container = document.getElementById("cards");
	if (container) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "inline-random-btn";
		btn.textContent = "🎲 다음 랜덤";
		btn.addEventListener("click", showRandom);
		const sentinel = container.querySelector(".scroll-sentinel");
		if (sentinel) {
			container.insertBefore(btn, sentinel);
		} else {
			container.appendChild(btn);
		}
	}

	window.scrollTo({ top: 0 });
}

// --- Dark mode ---
function setDarkMode(dark: boolean) {
	if (dark) {
		document.documentElement.setAttribute("data-theme", "dark");
	} else {
		document.documentElement.removeAttribute("data-theme");
	}

	const icon = document.querySelector<HTMLElement>(".dark-toggle-icon");
	if (icon) {
		icon.innerHTML = dark ? "&#x1F319;" : "&#x2600;&#xFE0F;";
		icon.style.visibility = "visible";
	}

	try {
		localStorage.setItem("dadjoke-dark", dark ? "1" : "0");
	} catch {
		/* noop */
	}
}

function isDarkMode(): boolean {
	try {
		const saved = localStorage.getItem("dadjoke-dark");
		if (saved !== null) return saved === "1";
	} catch {
		/* noop */
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// --- Always-reveal ---
function setAlwaysReveal(on: boolean) {
	const container = document.getElementById("cards");
	if (container) {
		container.classList.toggle("always-reveal", on);
		// When turning off always-reveal, remove revealed class from all cards
		if (!on) {
			const cards = container.querySelectorAll(".card.revealed");
			cards.forEach((card) => {
				card.classList.remove("revealed");
				card.setAttribute("aria-expanded", "false");
			});
		}
	}

	const btn = document.getElementById("reveal-toggle");
	if (btn) btn.setAttribute("aria-pressed", String(on));

	try {
		localStorage.setItem("dadjoke-always-reveal", on ? "1" : "0");
	} catch {
		/* noop */
	}
}

function isAlwaysReveal(): boolean {
	try {
		return localStorage.getItem("dadjoke-always-reveal") === "1";
	} catch {
		return false;
	}
}

// --- Init ---
const cardsEl = document.getElementById("cards");
if (cardsEl) {
	renderBatch(cardsEl);
	setupInfiniteScroll(cardsEl);
}

// Search count (initial)
const searchCountEl = document.getElementById("search-count");
if (searchCountEl) searchCountEl.textContent = `${allJokes.length}개`;

// Version
const versionEl = document.getElementById("version");
if (versionEl) versionEl.textContent = __APP_VERSION__;

// Shuffle
document.querySelector(".shuffle-btn")?.addEventListener("click", shuffle);

// Search
const searchInput = document.getElementById("search") as HTMLInputElement;
const searchClearBtn = document.getElementById("search-clear");
if (searchInput) {
	let debounceTimer: ReturnType<typeof setTimeout>;
	searchInput.addEventListener("input", () => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => search(searchInput.value), 200);
		if (searchClearBtn) searchClearBtn.hidden = !searchInput.value;
	});
}
if (searchClearBtn) {
	searchClearBtn.addEventListener("click", () => {
		if (searchInput) {
			searchInput.value = "";
			search("");
		}
		searchClearBtn.hidden = true;
	});
}

// Random
document.getElementById("random-btn")?.addEventListener("click", showRandom);

// Scroll-to-top
const scrollTopBtn = document.getElementById("scroll-top");
if (scrollTopBtn) {
	let ticking = false;
	window.addEventListener("scroll", () => {
		if (!ticking) {
			requestAnimationFrame(() => {
				scrollTopBtn.classList.toggle("visible", window.scrollY > 400);
				ticking = false;
			});
			ticking = true;
		}
	});
	scrollTopBtn.addEventListener("click", () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	});
}

// Dark mode toggle
const darkToggleBtn = document.getElementById("dark-toggle");
if (darkToggleBtn) {
	darkToggleBtn.addEventListener("click", () => {
		const isDark =
			document.documentElement.getAttribute("data-theme") === "dark";
		setDarkMode(!isDark);
	});
}

// Restore dark mode preference
setDarkMode(isDarkMode());

// Always-reveal toggle
const revealToggleBtn = document.getElementById("reveal-toggle");
if (revealToggleBtn) {
	revealToggleBtn.addEventListener("click", () => {
		const on = revealToggleBtn.getAttribute("aria-pressed") === "true";
		setAlwaysReveal(!on);
	});
}
setAlwaysReveal(isAlwaysReveal());

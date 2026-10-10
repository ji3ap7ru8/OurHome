// 右側滑出式系統設定視窗模板
export const settingsPanelTemplate = `
        <div id="settingsPage" class="translate-x-full absolute top-0 bottom-0 right-0 w-[91%] bg-[#fcfbf9] dark:bg-slate-900 rounded-l-[36px] z-50 flex flex-col soft-shadow-lg border-l border-slate-200/60 dark:border-slate-800 transition-transform duration-300 ease-out overflow-hidden">
            
            <!-- Top Sticky Navigation Bar -->
            <div class="pt-5 pb-3 px-5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
                <div class="flex items-center gap-2">
                    <i id="settingsHeaderIcon" class="fa-solid fa-gear text-base theme-text-primary"></i>
                    <h1 id="settingsHeaderTitle" class="text-base font-black text-slate-800 dark:text-slate-100 tracking-wider">系統設定</h1>
                </div>
                <div class="flex items-center gap-2">
                <button id="settingsGearBtn" data-action="open-settings" data-mode="all" title="系統設定" class="hidden w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300/70 theme-text-primary flex items-center justify-center transition-all active:scale-90">
                    <i class="fa-solid fa-gear text-base"></i>
                </button>
                <button data-action="close-settings" title="關閉設定" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
                </div>
            </div>

            <!-- Scrollable Settings List -->
            <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-12">

                <!-- 隱私與安全聲明橫幅 (移至系統設定最上方) -->
                <div id="privacyNotice" class="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5 flex items-start gap-2">
                    <i class="fa-solid fa-shield-halved text-amber-600 dark:text-amber-400 text-xs mt-0.5 shrink-0"></i>
                    <div class="text-[10px] text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                        <span class="font-bold">無痕隱私機制：</span>本網頁不保存個人資料，離開網頁或登入/登出後將立刻自動清除所有暫存數據。
                    </div>
                </div>

                <!-- 1. 圖卡一：網頁狀態（精簡版；有資料來源在同步時，該列與標題都會顯示「同步中…」） -->
                <div id="cardStatus" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden p-3 space-y-2">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-lg theme-bg-light theme-text-primary flex items-center justify-center text-xs shrink-0">
                            <i class="fa-solid fa-server"></i>
                        </div>
                        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100 flex-1">網頁狀態</h3>
                        <span id="statusSyncBadge" class="hidden items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                            <i class="fa-solid fa-arrows-rotate fa-spin text-[9px]"></i>同步中…
                        </span>
                    </div>

                    <div class="space-y-1.5">
                        <div class="bg-slate-50 dark:bg-slate-700/40 rounded-lg px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <i class="fa-brands fa-google-drive text-amber-500 text-xs w-4 text-center"></i>
                                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">Google 雲端</span>
                            </div>
                            <span id="statusGoogleBadge" class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                                <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                訪客模式
                            </span>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-700/40 rounded-lg px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-server text-orange-500 text-xs w-4 text-center"></i>
                                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">firebase 伺服器</span>
                            </div>
                            <span id="statusFirebaseServerBadge" class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                                <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                離線
                            </span>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-700/40 rounded-lg px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-user-shield text-orange-500 text-xs w-4 text-center"></i>
                                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">firebase 私人端</span>
                            </div>
                            <span id="statusFirebasePrivateBadge" class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                                <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                離線
                            </span>
                        </div>
                    </div>

                    <!-- 自動登入（不登出）：預設關閉；開關值存在 Google 雲端硬碟 -->
                    <div class="bg-slate-50 dark:bg-slate-700/40 rounded-lg px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-700 space-y-1">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-right-to-bracket text-sky-500 text-xs w-4 text-center"></i>
                                <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200">自動登入（不登出）</span>
                            </div>
                            <label class="relative inline-flex items-center gap-1.5 cursor-pointer" title="每次進入網頁自動登入">
                                <input type="checkbox" id="autoLoginToggle" data-change="auto-login" class="sr-only peer">
                                <div class="oh-switch"></div><span class="oh-switch-text" aria-hidden="true"></span>
                            </label>
                        </div>
                        <p class="text-[10px] text-slate-400 leading-snug">開啟後，這個瀏覽器每次進入網頁都會自動登入；關閉則每次都要登入。公共場所請保持關閉。需先登入 Google 才能切換，設定會存在雲端硬碟。</p>
                    </div>

                    <!-- 立即同步：重新讀取 Google 雲端硬碟的設定，並重新連線兩個 Firebase 抓最新資料 -->
                    <button id="syncNowBtn" data-action="sync-now" class="w-full py-2 rounded-lg theme-bg-primary text-white text-[11px] font-bold soft-shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:pointer-events-none">
                        <i data-icon class="fa-solid fa-arrows-rotate"></i>
                        <span data-label>立即同步</span>
                    </button>
                </div>

                <!-- 2. 圖卡二：個人化 (預設收合) -->
                <div id="cardPersonal" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-accordion-trigger="personal" aria-expanded="false" aria-controls="contentPersonal" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-palette"></i>
                            </div>
                            <div>
                                <h3 id="personalTitle" class="text-xs font-bold text-slate-800 dark:text-slate-100">個人化</h3>
                                <p id="personalDesc" class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">主題、主色調、字體與介面排版</p>
                            </div>
                        </div>
                        <i id="arrowPersonal" class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <!-- 詳細內容 (預設 hidden 收合) -->
                    <div id="contentPersonal" class="acc-body" data-accordion-body="personal">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
                        
                        <div data-only="system" class="space-y-4">
<!-- 0. 暱稱（預設為 Google 帳號名稱，登入後存到 Google 雲端硬碟） -->
                        <div class="space-y-2">
                            <div class="flex items-center gap-3">
                                <i class="fa-regular fa-id-badge text-slate-400 text-sm w-4 text-center"></i>
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">暱稱</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <input id="nicknameInput" data-input="nickname" type="text" maxlength="20" autocomplete="off" placeholder="暱稱"
                                    class="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:theme-border-primary disabled:opacity-50">
                                <button id="nicknameResetBtn" data-action="nickname-reset" disabled
                                    class="shrink-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100">
                                    預設Google名稱
                                </button>
                            </div>
                            <p id="nicknameNote" class="text-[10px] text-slate-400 pl-7">大廳會顯示「Google帳號(暱稱)」，設定會同步儲存到你的 Google 雲端硬碟。</p>
                        </div>

                        <hr class="border-slate-100 dark:border-slate-700/60">

                        </div>

                        <!-- 1. 操作提示 -->
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="fa-regular fa-lightbulb text-slate-400 text-sm w-4 text-center"></i>
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">操作提示說明</span>
                            </div>
                            <label class="relative inline-flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked class="sr-only peer">
                                <div class="oh-switch"></div><span class="oh-switch-text" aria-hidden="true"></span>
                            </label>
                        </div>

                        <hr class="border-slate-100 dark:border-slate-700/60">

                        <div data-only="system" class="space-y-4">
<!-- 2. 外觀主題 -->
                        <div class="space-y-2">
                            <div class="flex items-center gap-3">
                                <i class="fa-solid fa-circle-half-stroke text-slate-400 text-sm w-4 text-center"></i>
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">外觀主題</span>
                            </div>
                            <div class="grid grid-cols-3 gap-2 pt-1">
                                <button id="themeLightBtn" data-action="set-theme" data-theme="light" class="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                                    <i class="fa-regular fa-sun"></i> 淺色
                                </button>
                                <button id="themeDarkBtn" data-action="set-theme" data-theme="dark" class="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                                    <i class="fa-regular fa-moon"></i> 深色
                                </button>
                                <button id="themeSystemBtn" data-action="set-theme" data-theme="system" class="py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                                    <i class="fa-solid fa-desktop"></i> 跟隨系統
                                </button>
                            </div>
                        </div>

                        <hr class="border-slate-100 dark:border-slate-700/60">

                        <!-- 3. 外觀主色調 -->
                        <div class="space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <i class="fa-solid fa-palette text-slate-400 text-sm w-4 text-center"></i>
                                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">外觀主色調</span>
                                </div>
                                <span id="colorSwatchName" class="text-[10px] theme-text-primary font-bold">晨曦藍</span>
                            </div>
                            <div class="flex items-center justify-between pt-1 px-1">
                                <button data-action="set-color" data-primary="#0284c7" data-light="#e0f2fe" data-dark="#0369a1" data-name="晨曦藍" class="w-8 h-8 rounded-full bg-sky-500 hover:scale-110 active:scale-95 transition-all ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-800"></button>
                                <button data-action="set-color" data-primary="#059669" data-light="#d1fae5" data-dark="#047857" data-name="鼠尾草綠" class="w-8 h-8 rounded-full bg-emerald-600 hover:scale-110 active:scale-95 transition-all"></button>
                                <button data-action="set-color" data-primary="#e11d48" data-light="#ffe4e6" data-dark="#be123c" data-name="蜜桃粉" class="w-8 h-8 rounded-full bg-rose-500 hover:scale-110 active:scale-95 transition-all"></button>
                                <button data-action="set-color" data-primary="#7c3aed" data-light="#ede9fe" data-dark="#6d28d9" data-name="薰衣草紫" class="w-8 h-8 rounded-full bg-violet-600 hover:scale-110 active:scale-95 transition-all"></button>
                                <button data-action="set-color" data-primary="#d97706" data-light="#fef3c7" data-dark="#b45309" data-name="琥珀橘" class="w-8 h-8 rounded-full bg-amber-600 hover:scale-110 active:scale-95 transition-all"></button>
                            </div>
                        </div>

                        <hr class="border-slate-100 dark:border-slate-700/60">

                        <!-- 4. 字體大小 -->
                        <div class="space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <i class="fa-solid fa-font text-slate-400 text-sm w-4 text-center"></i>
                                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">字體大小</span>
                                </div>
                                <span id="fontScaleLabel" class="text-xs theme-text-primary font-bold">100% (標準)</span>
                            </div>
                            <div class="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <button data-action="font-step" data-delta="-5" class="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center justify-center soft-shadow-sm hover:scale-105 active:scale-95 transition-all">
                                    <i class="fa-solid fa-minus text-xs"></i>
                                </button>
                                <input id="fontSizeRange" type="range" min="80" max="150" value="100" step="5" data-input="font-scale" class="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer">
                                <button data-action="font-step" data-delta="5" class="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center justify-center soft-shadow-sm hover:scale-105 active:scale-95 transition-all">
                                    <i class="fa-solid fa-plus text-xs"></i>
                                </button>
                            </div>
                            <div class="flex justify-between px-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                                <span>精簡 (80%)</span>
                                <span>標準 (100%)</span>
                                <span>長輩 (130%)</span>
                                <span>特大 (150%)</span>
                            </div>
                        </div>

                        <hr class="border-slate-100 dark:border-slate-700/60">

                        </div>

                        <div data-only="system" class="space-y-4">
                        <!-- 5. 排版大廳佈置 -->
                        <button data-action="open-settings" data-mode="personal" class="w-full flex items-center justify-between text-left group py-0.5">
                            <div class="flex items-center gap-3">
                                <i class="fa-solid fa-table-cells-large text-slate-400 text-sm w-4 text-center"></i>
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">大廳設定</span>
                            </div>
                            <i class="fa-solid fa-chevron-right text-xs text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors"></i>
                        </button>

                        <hr class="border-slate-100 dark:border-slate-700/60">

                        <!-- 5-1. 所有應用設定（切換到「所有應用設定」頁） -->
                        <button data-action="open-apps-options" class="w-full flex items-center justify-between text-left group py-0.5">
                            <div class="flex items-center gap-3">
                                <i class="fa-solid fa-border-all text-slate-400 text-sm w-4 text-center"></i>
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">所有應用設定</span>
                            </div>
                            <i class="fa-solid fa-chevron-right text-xs text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors"></i>
                        </button>

                        <hr class="border-slate-100 dark:border-slate-700/60">

                        <!-- 5-2. 生活圖卡設定（切換到「生活圖卡設定」頁） -->
                        <button data-action="open-cards-options" class="w-full flex items-center justify-between text-left group py-0.5">
                            <div class="flex items-center gap-3">
                                <i class="fa-solid fa-images text-slate-400 text-sm w-4 text-center"></i>
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">生活圖卡設定</span>
                            </div>
                            <i class="fa-solid fa-chevron-right text-xs text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors"></i>
                        </button>

                        <hr class="border-slate-100 dark:border-slate-700/60">
                        </div>

                        <!-- 6. 排序下方快捷功能 -->
                        <div class="space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <i class="fa-solid fa-sliders text-slate-400 text-sm w-4 text-center"></i>
                                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">排序下方快捷功能</span>
                                </div>
                                <label class="relative inline-flex items-center gap-1.5 cursor-pointer" title="顯示下方快捷功能">
                                    <input type="checkbox" id="dockVisibleToggle" data-change="dock-visible" checked class="sr-only peer">
                                    <div class="oh-switch"></div><span class="oh-switch-text" aria-hidden="true"></span>
                                </label>
                            </div>
                            <div class="grid grid-cols-5 gap-1 pt-1 text-center">
                                <button type="button" data-action="shortcut-pick" data-index="0" id="selectShortcut0" class="shortcut-slot flex flex-col items-center justify-center gap-0.5 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 active:scale-95 transition-all"></button>
                                <button type="button" data-action="shortcut-pick" data-index="1" id="selectShortcut1" class="shortcut-slot flex flex-col items-center justify-center gap-0.5 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 active:scale-95 transition-all"></button>
                                <button type="button" data-action="shortcut-pick" data-index="2" id="selectShortcut2" class="shortcut-slot flex flex-col items-center justify-center gap-0.5 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 active:scale-95 transition-all"></button>
                                <button type="button" data-action="shortcut-pick" data-index="3" id="selectShortcut3" class="shortcut-slot flex flex-col items-center justify-center gap-0.5 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 active:scale-95 transition-all"></button>
                                <button type="button" data-action="shortcut-pick" data-index="4" id="selectShortcut4" class="shortcut-slot flex flex-col items-center justify-center gap-0.5 py-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 active:scale-95 transition-all"></button>
                            </div>
                            <p id="shortcutHint" class="text-[10px] text-slate-400 leading-snug">點格子更換功能・5 格至少要保留一個「大廳」。關閉開關後，下方快捷列會隱藏，只能在大廳頁操作（其他頁會留一個「回大廳」小按鈕）。</p>
                        </div>

                    </div>
                </div>
            </div>
                </div>

                <!-- 大廳設定（只在「大廳設定」模式顯示；內容由 components/lobby-settings.js 繪製） -->
                <div id="cardLobbyShow" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all hidden">
                    <button data-accordion-trigger="lobbyShow" aria-expanded="false" aria-controls="content_lobbyShow" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-eye"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">顯示管理</h3>
                                <p id="lobbyShowSummary" class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">選擇大廳要顯示哪些服務</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="content_lobbyShow" class="acc-body" data-accordion-body="lobbyShow">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                                <p class="text-[10px] text-slate-400 leading-relaxed">只列出已啟用的服務，順序同「所有應用」。預設全部關閉，開啟的服務才會出現在大廳。</p>
                                <div id="lobbyShowList" class="space-y-1.5"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="cardLobbyOrder" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all hidden">
                    <button data-accordion-trigger="lobbyOrder" aria-expanded="false" aria-controls="content_lobbyOrder" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-sort"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">大廳排序</h3>
                                <p id="lobbyOrderSummary" class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">調整服務在大廳的先後順序</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="content_lobbyOrder" class="acc-body" data-accordion-body="lobbyOrder">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                                <div id="lobbyOrderBox" class="space-y-2"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 儲存位置 (預設收合)：我的筆記、記帳本各自選 不保存 / Google 雲端 / Firebase 私人端（components/cloud-settings.js 處理） -->
                <div id="cardStorage" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-accordion-trigger="storage" aria-expanded="false" aria-controls="contentStorage" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-location-dot"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">儲存位置</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">我的筆記、記帳本要存到哪裡</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentStorage" class="acc-body" data-accordion-body="storage">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
            <div class="space-y-1.5">
                <div class="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><i class="fa-solid fa-note-sticky text-xs text-orange-500"></i>我的筆記<span data-store-status="memos" class="ml-auto text-[10px] font-bold text-slate-400"></span></div>
                <div class="grid grid-cols-4 gap-1">
                <label class="cursor-pointer block">
                    <input type="radio" name="store-memos" value="google" class="peer sr-only">
                    <span class="flex flex-col items-center justify-start gap-0.5 h-full py-1.5 px-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-300 text-center leading-tight transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/30 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                        <i class="fa-brands fa-google-drive text-sm"></i><span class="leading-tight">Google<br>雲端</span><span class="text-[8px] font-bold px-1 py-px rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">安全</span>
                    </span>
                </label>
                <label class="cursor-pointer block">
                    <input type="radio" name="store-memos" value="none" class="peer sr-only" checked>
                    <span class="flex flex-col items-center justify-start gap-0.5 h-full py-1.5 px-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-300 text-center leading-tight transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/30 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                        <i class="fa-solid fa-ban text-sm"></i><span class="leading-tight">不保存<br>&nbsp;</span><span class="text-[8px] font-bold px-1 py-px rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">預設</span>
                    </span>
                </label>
                <label class="cursor-pointer block">
                    <input type="radio" name="store-memos" value="server" class="peer sr-only">
                    <span class="flex flex-col items-center justify-start gap-0.5 h-full py-1.5 px-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-300 text-center leading-tight transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/30 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                        <i class="fa-solid fa-server text-sm"></i><span class="leading-tight">Firebase<br>伺服器</span><span class="text-[8px] font-bold px-1 py-px rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">快速</span>
                    </span>
                </label>
                <label class="cursor-pointer block">
                    <input type="radio" name="store-memos" value="private" class="peer sr-only">
                    <span class="flex flex-col items-center justify-start gap-0.5 h-full py-1.5 px-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-300 text-center leading-tight transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/30 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                        <i class="fa-solid fa-fire text-sm"></i><span class="leading-tight">Firebase<br>私人端</span><span class="text-[8px] font-bold px-1 py-px rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">隱私高</span>
                    </span>
                </label>
                </div>
            </div>
            <div class="space-y-1.5">
                <div class="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"><i class="fa-solid fa-book text-xs text-orange-500"></i>記帳本<span data-store-status="ledger" class="ml-auto text-[10px] font-bold text-slate-400"></span></div>
                <div class="grid grid-cols-4 gap-1">
                <label class="cursor-pointer block">
                    <input type="radio" name="store-ledger" value="google" class="peer sr-only">
                    <span class="flex flex-col items-center justify-start gap-0.5 h-full py-1.5 px-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-300 text-center leading-tight transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/30 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                        <i class="fa-brands fa-google-drive text-sm"></i><span class="leading-tight">Google<br>雲端</span><span class="text-[8px] font-bold px-1 py-px rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">安全</span>
                    </span>
                </label>
                <label class="cursor-pointer block">
                    <input type="radio" name="store-ledger" value="none" class="peer sr-only" checked>
                    <span class="flex flex-col items-center justify-start gap-0.5 h-full py-1.5 px-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-300 text-center leading-tight transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/30 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                        <i class="fa-solid fa-ban text-sm"></i><span class="leading-tight">不保存<br>&nbsp;</span><span class="text-[8px] font-bold px-1 py-px rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">預設</span>
                    </span>
                </label>
                <label class="cursor-pointer block">
                    <input type="radio" name="store-ledger" value="server" class="peer sr-only">
                    <span class="flex flex-col items-center justify-start gap-0.5 h-full py-1.5 px-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-300 text-center leading-tight transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/30 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                        <i class="fa-solid fa-server text-sm"></i><span class="leading-tight">Firebase<br>伺服器</span><span class="text-[8px] font-bold px-1 py-px rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">快速</span>
                    </span>
                </label>
                <label class="cursor-pointer block">
                    <input type="radio" name="store-ledger" value="private" class="peer sr-only">
                    <span class="flex flex-col items-center justify-start gap-0.5 h-full py-1.5 px-0.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[9px] font-bold text-slate-500 dark:text-slate-300 text-center leading-tight transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/30 peer-checked:text-emerald-700 dark:peer-checked:text-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400">
                        <i class="fa-solid fa-fire text-sm"></i><span class="leading-tight">Firebase<br>私人端</span><span class="text-[8px] font-bold px-1 py-px rounded-full bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-300">隱私高</span>
                    </span>
                </label>
                </div>
            </div>
            <p class="text-[10px] text-slate-400 leading-relaxed">選好後按下方〔儲存位置設定〕才會生效。「不保存」只留在目前畫面，關閉或重新整理就清除；「Google 雲端」要先登入，存在你的雲端硬碟隱藏資料夾；「Firebase 伺服器」使用家庭共用的伺服器資料庫（目前僅供選擇）；「Firebase 私人端」要先在下方「資料管理」設定並儲存私人端 firebaseConfig。</p>

                                <button data-action="storage-save" class="w-full py-2.5 rounded-xl theme-bg-primary text-white text-xs font-bold soft-shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5">
                                    <i class="fa-solid fa-floppy-disk"></i> 儲存位置設定
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. 圖卡三：資料管理 (預設收合) -->
                <div id="cardData" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-accordion-trigger="data" aria-expanded="false" aria-controls="contentData" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-database"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">資料管理</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">Google 雲端硬碟與 Firestore 設定</p>
                            </div>
                        </div>
                        <i id="arrowData" class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <!-- 詳細內容 (預設 hidden 收合) -->
                    <div id="contentData" class="acc-body" data-accordion-body="data">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
                        <!-- 1. Google 雲端硬碟 -->
                        <div class="space-y-2">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2.5">
                                    <i class="fa-brands fa-google-drive text-amber-500 text-lg"></i>
                                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Google 雲端硬碟</span>
                                </div>
                                <span id="gdriveStatusBadge" class="text-[10px] text-slate-400">訪客模式</span>
                            </div>

                            <div id="gdriveGuestBox" class="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                                <div class="text-[11px] text-slate-500 dark:text-slate-400">
                                    需登入會員帳號方可使用雲端同步
                                </div>
                                <button data-action="open-login-from-settings" class="px-3 py-1.5 theme-bg-primary text-white text-xs font-bold rounded-xl soft-shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1">
                                    <i class="fa-solid fa-right-to-bracket text-xs"></i>
                                    <span>帳號登入</span>
                                </button>
                            </div>

                            <div id="gdriveUserBox" class="hidden space-y-2">
                                <div class="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-2.5 px-3">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <span id="gdriveAvatar" class="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                                            <i class="fa-solid fa-circle-check text-xs"></i>
                                        </span>
                                        <div class="flex flex-col min-w-0">
                                            <span id="gdriveName" class="text-[11px] font-black text-emerald-900 dark:text-emerald-200 truncate"></span>
                                            <span id="gdriveEmail" class="text-[10px] font-bold text-emerald-800/80 dark:text-emerald-300/80 truncate"></span>
                                        </div>
                                    </div>
                                    <button data-action="logout" class="text-[10px] text-slate-400 hover:text-slate-600 underline">登出</button>
                                </div>
                            </div>
                        </div>

                        <hr class="border-slate-100 dark:border-slate-700/60">

                        <!-- 2. firebase Firestore 資料庫 -->
                        <div class="space-y-3">
                            <div class="flex items-center gap-2.5">
                                <i class="fa-solid fa-fire text-orange-500 text-lg"></i>
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">firebase Firestore 資料庫</span>
                            </div>

                            <!-- 伺服器 Server 功能區塊：未登入預設上鎖；內容預設收合，避免直接顯示 config -->
                            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                <button type="button" data-fold-trigger="fbServer" aria-expanded="false" class="w-full p-3 flex items-center justify-between gap-2 text-left">
                                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <i class="fa-solid fa-server text-xs text-orange-500"></i>
                                        <span>firebaseConfig (伺服器 Server)</span>
                                    </span>
                                    <span class="flex items-center gap-2">
                                        <span id="firebaseServerBadge" class="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                            <i class="fa-solid fa-lock text-[9px]"></i> 需登入帳號
                                        </span>
                                        <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 acc-arrow"></i>
                                    </span>
                                </button>
                                <div class="acc-body" data-fold-body="fbServer">
                                    <div class="acc-inner">
                                        <div class="px-3 pb-3 space-y-2">
                                            <textarea id="firebaseServerInput" rows="2" disabled placeholder="貼上伺服器 firebaseConfig..." class="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none"></textarea>
                                            <p class="text-[10px] text-slate-400 leading-relaxed">需登入 Google 帳號才能使用；設定存在你的雲端硬碟。</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- 私人端 Private：內容預設收合 -->
                            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                <button type="button" data-fold-trigger="fbPrivate" aria-expanded="false" class="w-full p-3 flex items-center justify-between gap-2 text-left">
                                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <i class="fa-solid fa-user-shield text-xs text-orange-500"></i>
                                        <span>firebaseConfig (私人端 Private)</span>
                                    </span>
                                    <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 acc-arrow"></i>
                                </button>
                                <div class="acc-body" data-fold-body="fbPrivate">
                                    <div class="acc-inner">
                                        <div class="px-3 pb-3 space-y-2">
                                            <textarea id="firebasePrivateInput" rows="2" disabled placeholder="貼上私人 firebaseConfig..." class="w-full px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[11px] text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"></textarea>
                                            <p class="text-[10px] text-slate-400 leading-relaxed">不需登入也能使用；登入 Google 後會一併存到你的雲端硬碟，換手機自動帶入。</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button id="firebaseSaveBtn" data-action="fb-save" class="w-full py-2.5 rounded-xl theme-bg-primary text-white text-xs font-bold soft-shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-1.5">
                                <i class="fa-solid fa-floppy-disk"></i> 儲存並同步
                            </button>
                        </div>

                        <hr class="border-slate-100 dark:border-slate-700/60">

                        <!-- 3. LINE Notify：標題在收合外面（同 firebase），底下三個各自可收合：Apps Script、Bot Token、接收對象 -->
                        <div class="space-y-3">
                            <div class="flex items-center gap-2.5">
                                <i class="fa-brands fa-line text-emerald-500 text-lg"></i>
                                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">LINE Notify</span>
                                <span id="lineBotCount" class="text-[10px] font-medium text-slate-400"></span>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                <button type="button" data-fold-trigger="lineRelay" aria-expanded="false" class="w-full p-3 flex items-center justify-between gap-2 text-left">
                                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <i class="fa-solid fa-code text-xs text-emerald-500"></i>
                                        <span>Apps Script</span>
                                    </span>
                                    <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 acc-arrow"></i>
                                </button>
                                <div class="acc-body" data-fold-body="lineRelay">
                                    <div class="acc-inner">
                                        <div class="px-3 pb-3 space-y-3">
                                        <div class="space-y-2">
                                            <label for="lineRelayUrl" class="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">中繼站 URL<span class="text-[10px] font-medium text-slate-400 ml-1">（Google Apps Script 網址）</span></label>
                                            <input id="lineRelayUrl" type="text" inputmode="url" data-lpignore="true" data-1p-ignore data-form-type="other" name="x-line-relay-url" enterkeyhint="done" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" class="select-text w-full min-w-0 px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
                                            <p id="lineRelayUrlState" class="text-[10px] text-slate-400"></p>
                                        </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                <button type="button" data-fold-trigger="lineToken" aria-expanded="false" class="w-full p-3 flex items-center justify-between gap-2 text-left">
                                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <i class="fa-solid fa-key text-xs text-emerald-500"></i>
                                        <span>Bot Token</span>
                                    </span>
                                    <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 acc-arrow"></i>
                                </button>
                                <div class="acc-body" data-fold-body="lineToken">
                                    <div class="acc-inner">
                                        <div class="px-3 pb-3 space-y-3">
                                        <div class="space-y-2">
                                            <label for="lineBotToken" class="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">Bot Token<span class="text-[10px] font-medium text-slate-400 ml-1">（Channel access token）</span></label>
                                            <div class="flex items-center gap-2">
                                                <input id="lineBotToken" type="text" data-mask="on" data-lpignore="true" data-1p-ignore data-form-type="other" name="x-line-bot-token" enterkeyhint="done" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="貼上 Bot Token" class="select-text flex-1 min-w-0 px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
                                                <button type="button" data-action="linebot-token-eye" aria-label="顯示或隱藏 Bot Token" class="shrink-0 w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-400 flex items-center justify-center active:scale-90 transition"><i id="lineBotTokenEye" class="fa-solid fa-eye text-sm"></i></button>
                                            </div>
                                            <p id="lineBotTokenState" class="text-[10px] text-slate-400"></p>
                                        </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                <button type="button" data-fold-trigger="lineTargets" aria-expanded="false" class="w-full p-3 flex items-center justify-between gap-2 text-left">
                                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <i class="fa-solid fa-user-group text-xs text-emerald-500"></i>
                                        <span>接收對象</span>
                                    </span>
                                    <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 acc-arrow"></i>
                                </button>
                                <div class="acc-body" data-fold-body="lineTargets">
                                    <div class="acc-inner">
                                        <div class="px-3 pb-3 space-y-3">
                                        <div class="space-y-2">
                                            <label for="lineBotName" class="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">名稱<span class="text-[10px] font-medium text-slate-400 ml-1">（可不填，最多 20 字）</span></label>
                                            <input id="lineBotName" type="text" maxlength="20" autocomplete="off" enterkeyhint="next" placeholder="例如：媽媽" class="select-text w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
                                            <label for="lineBotValue" class="text-[11px] font-bold text-slate-700 dark:text-slate-200 block pt-1">User ID</label>
                                            <input id="lineBotValue" type="text" enterkeyhint="done" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="例如：U1234abcd…" class="select-text w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
                                            <button type="button" data-action="linebot-add" class="w-full py-2.5 rounded-xl theme-bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"><i class="fa-solid fa-plus"></i> 新增 User ID</button>
                                        </div>
                                        <div id="lineBotList" class="space-y-2"></div>
                                        <p class="text-[10px] text-slate-400 leading-relaxed">Bot Token 只有一組，底下的 User ID 可新增多個、數量不限；登入 Google 後會自動存到你的雲端硬碟，換手機也會帶著走。</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
                </div>

                <!-- 4. 圖卡四：備份還原 (預設收合) -->
                <div id="cardBackup" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-accordion-trigger="backup" aria-expanded="false" aria-controls="contentBackup" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-clock-rotate-left"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">備份還原</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">雲端硬碟與所有檔案的匯出、匯入</p>
                            </div>
                        </div>
                        <i id="arrowBackup" class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentBackup" class="acc-body" data-accordion-body="backup">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-4">

                                <!-- API 資料更新：重新取得 Google 授權、重新讀取雲端設定與 Firebase、重新載入日曆 -->
                                <div class="space-y-2">
                                    <div class="flex items-center gap-2.5">
                                        <i class="fa-solid fa-plug-circle-bolt theme-text-primary text-lg"></i>
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">API 資料更新</span>
                                    </div>
                                    <p class="text-[10px] text-slate-400 leading-relaxed">雲端硬碟的 default（預設參數）不能被使用者改寫，只有按「API 資料更新」才會用伺服器 Firestore 的 default 覆蓋進去；你自己的修改一律存在 settings。新使用者貼好伺服器 firebaseConfig 後按一次，就會載入預設參數。改到預設時，按「還原預設參數」可直接讀取雲端硬碟的 default。</p>
                                    <div class="grid grid-cols-2 gap-2">
                                        <button id="apiRefreshBtn" data-action="api-refresh" data-backup-btn class="py-2.5 px-1 rounded-xl theme-bg-light theme-text-primary border border-slate-200 dark:border-slate-600 font-bold text-xs soft-shadow-sm flex flex-col items-center justify-center gap-1 leading-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                                            <i data-icon class="fa-solid fa-rotate"></i>
                                            <span data-label>API 資料更新</span>
                                        </button>
                                        <button data-action="restore-defaults" data-backup-btn class="py-2.5 px-1 rounded-xl bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs soft-shadow-sm flex flex-col items-center justify-center gap-1 leading-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                                            <i class="fa-solid fa-rotate-left theme-text-primary"></i>
                                            <span>還原預設參數</span>
                                        </button>
                                    </div>
                                </div>

                                <hr class="border-slate-100 dark:border-slate-700/60">

                                <!-- Google 雲端硬碟：只含系統設定 + 兩組 firebaseConfig -->
                                <div class="space-y-2">
                                    <div class="flex items-center gap-2.5">
                                        <i class="fa-brands fa-google-drive text-amber-500 text-lg"></i>
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">Google 雲端硬碟</span>
                                    </div>
                                    <p class="text-[10px] text-slate-400 leading-relaxed">設定檔平常存在雲端硬碟的隱藏資料夾，看不到檔案。匯出：把裡面的系統設定與 firebaseConfig 下載成 JSON 檔。匯入：選擇這種 JSON 檔，寫回雲端硬碟並重新連線。</p>
                                    <div class="grid grid-cols-2 gap-2">
                                <button data-action="drive-export" data-backup-btn class="py-2.5 px-1 rounded-xl bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs soft-shadow-sm flex flex-col items-center justify-center gap-1 leading-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                                    <i class="fa-solid fa-cloud-arrow-up theme-text-primary"></i>
                                    <span>匯出 Google 雲端硬碟</span>
                                </button>
                                <button data-action="drive-import" data-backup-btn class="py-2.5 px-1 rounded-xl bg-slate-50 dark:bg-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs soft-shadow-sm flex flex-col items-center justify-center gap-1 leading-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                                    <i class="fa-solid fa-cloud-arrow-down theme-text-primary"></i>
                                    <span>匯入 Google 雲端硬碟</span>
                                </button>
                                    </div>
                                    <p id="backupDriveHint" class="text-[10px] text-slate-400">需登入 Google 帳號才能使用（未登入時按下會提示）。</p>
                                </div>

                                <hr class="border-slate-100 dark:border-slate-700/60">

                                <!-- 所有檔：下載 / 還原一份 JSON 備份檔 -->
                                <div class="space-y-2">
                                    <div class="flex items-center gap-2.5">
                                        <i class="fa-solid fa-box-archive text-slate-500 text-lg"></i>
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">所有檔案</span>
                                    </div>
                                    <p class="text-[10px] text-slate-400 leading-relaxed">下載或還原一份 JSON 備份檔，含系統設定與所有服務資料（包含個人記事與記帳），請只自己保管。</p>
                                    <div class="grid grid-cols-2 gap-2">
                                <button data-action="bundle-export" data-backup-btn class="py-2.5 px-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 font-bold text-xs soft-shadow-sm flex flex-col items-center justify-center gap-1 leading-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                                    <i class="fa-solid fa-box-archive theme-text-primary"></i>
                                    <span>所有檔匯出</span>
                                </button>
                                <button data-action="bundle-import" data-backup-btn class="py-2.5 px-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 font-bold text-xs soft-shadow-sm flex flex-col items-center justify-center gap-1 leading-tight transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
                                    <i class="fa-solid fa-box-open theme-text-primary"></i>
                                    <span>所有檔匯入</span>
                                </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                <!-- 管理員 (預設收合、預設上鎖)：要先登入 Google 帳號並輸入密碼才能解鎖；目前只有「最新提醒」，僅樣式、尚未接上功能 -->
                <div id="cardAdmin" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-accordion-trigger="admin" aria-expanded="false" aria-controls="contentAdmin" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-user-gear"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">管理員</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">管理員專用功能</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentAdmin" class="acc-body" data-accordion-body="admin">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-3">

                                <!-- 上鎖畫面：未解鎖時只顯示這個；需先登入 Google 帳號，再按〔驗證〕輸入密碼 -->
                                <div id="adminLocked" class="py-3 text-center space-y-2.5">
                                    <div class="w-12 h-12 rounded-2xl theme-bg-light theme-text-primary flex items-center justify-center text-xl mx-auto"><i class="fa-solid fa-lock"></i></div>
                                    <p class="text-xs font-bold text-slate-700 dark:text-slate-200">管理員功能已上鎖</p>
                                    <p id="adminLockHint" class="text-[10px] text-slate-400 leading-relaxed">需先登入 Google 帳號，再輸入管理員密碼才能使用。</p>
                                    <button id="adminVerifyBtn" data-action="admin-open-verify" class="px-6 py-2.5 rounded-xl theme-bg-primary text-white text-xs font-bold soft-shadow-sm hover:opacity-90 active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100">
                                        <i class="fa-solid fa-key"></i> 驗證
                                    </button>
                                </div>

                                <!-- 解鎖後的提示列 -->
                                <div id="adminUnlockedBar" class="hidden">
                                    <div class="flex items-center justify-between text-[10px] font-bold">
                                        <span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><i class="fa-solid fa-lock-open"></i> 已解鎖</span>
                                        <button data-action="admin-lock" class="text-slate-400 hover:text-slate-600 underline">重新上鎖</button>
                                    </div>
                                </div>

                                <!-- 解鎖後的功能入口：點「最新提醒」會從右側滑出編輯視窗（components/admin-reminder.js） -->
                                <button id="adminContent" data-action="open-admin-reminder" class="hidden w-full p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-200/80 dark:border-slate-700 items-center justify-between gap-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors">
                                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <i class="fa-solid fa-bell text-xs text-orange-500"></i>
                                        <span>最新提醒</span>
                                    </span>
                                    <span class="flex items-center gap-2">
                                        <span class="text-[10px] font-bold text-slate-400">編輯</span>
                                        <i class="fa-solid fa-chevron-right text-[10px] text-slate-400"></i>
                                    </span>
                                </button>

                            </div>
                        </div>
                    </div>
                </div>

                <!-- 登出按鈕 (右側視窗最下方，僅在已登入 Google 帳號時顯示) -->
                <div id="settingsLogoutBox" class="hidden pt-2 pb-4">
                    <button data-action="logout" class="w-full py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95">
                        <i class="fa-solid fa-right-from-bracket"></i>
                        <span>登出帳號</span>
                    </button>
                </div>

            </div>
        </div>
`;

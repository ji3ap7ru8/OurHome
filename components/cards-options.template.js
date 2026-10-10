// 生活圖卡頁的 ︙ 生活圖卡設定視窗（右側滑出，版型與所有應用設定相同）。
// 「格式大小」（瀏覽方式 / 瀏覽大小 / 每行數量 2 或 3 個）；「排序方式」（預設 / 名稱 / 自訂編號）的內容由 cards-options.js 動態畫在 #cardsSortOptions；其下是「新增圖卡」（新增表單；也在這裡編輯、刪除既有圖卡，詳細頁不再有編輯／刪除）；
// 最底下是使用者（Google 帳號）與登出。
export const cardsOptionsTemplate = `
        <div id="cardsOptionsPage" class="translate-x-full absolute top-0 bottom-0 right-0 w-[91%] bg-[#fcfbf9] dark:bg-slate-900 rounded-l-[36px] z-50 flex flex-col soft-shadow-lg border-l border-slate-200/60 dark:border-slate-800 transition-transform duration-300 ease-out overflow-hidden">

            <div class="pt-5 pb-3 px-5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-ellipsis-vertical text-base theme-text-primary"></i>
                    <h1 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-wider">生活圖卡設定</h1>
                </div>
                <div class="flex items-center gap-2">
                    <button data-action="open-settings" data-mode="all" title="系統設定" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300/70 theme-text-primary flex items-center justify-center transition-all active:scale-90">
                        <i class="fa-solid fa-gear text-base"></i>
                    </button>
                    <button data-action="close-apps-options" title="關閉設定" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-12">

                <div id="cardsCardFormat" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-tip="cards-format" data-accordion-trigger="cformat" aria-expanded="false" aria-controls="contentCFormat" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-text-height"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">格式大小</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">瀏覽方式、瀏覽大小與每行數量</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentCFormat" class="acc-body" data-accordion-body="cformat">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
                                <div class="space-y-2">
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-table-cells-large text-slate-400 text-sm w-4 text-center"></i>
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">瀏覽方式</span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2"><button type="button" data-action="cards-view" data-key="mode" data-value="card">圖卡</button><button type="button" data-action="cards-view" data-key="mode" data-value="list">清單</button></div>
                                </div>
                                <div class="space-y-2">
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-up-right-and-down-left-from-center text-slate-400 text-sm w-4 text-center"></i>
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">瀏覽大小</span>
                                    </div>
                                    <div class="grid grid-cols-3 gap-2"><button type="button" data-action="cards-view" data-key="size" data-value="l">大</button><button type="button" data-action="cards-view" data-key="size" data-value="m">中</button><button type="button" data-action="cards-view" data-key="size" data-value="s">小</button></div>
                                </div>
                                <div id="cardsOptCols" class="space-y-2 transition-opacity">
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-table-columns text-slate-400 text-sm w-4 text-center"></i>
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">每行數量（清單模式不適用）</span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2"><button type="button" data-action="cards-view" data-key="cols" data-value="2">2 個</button><button type="button" data-action="cards-view" data-key="cols" data-value="3">3 個</button></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="cardsCardSort" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-tip="cards-sort" data-accordion-trigger="csort" aria-expanded="false" aria-controls="contentCSort" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-arrow-down-wide-short"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">排序方式</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">預設、名稱或自訂編號</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentCSort" class="acc-body" data-accordion-body="csort">
                        <div class="acc-inner">
                            <div id="cardsSortOptions" class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3"></div>
                        </div>
                    </div>
                </div>

                <div id="cardsCardManage" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-tip="cards-manage" data-accordion-trigger="cmanage" aria-expanded="false" aria-controls="contentCManage" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-plus"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">新增圖卡</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">新增、編輯或刪除圖卡</p>
                            </div>
                        </div>
                        <i class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentCManage" class="acc-body" data-accordion-body="cmanage">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                                <button type="button" data-action="cards-add" class="w-full py-3 rounded-xl border-2 border-dashed theme-border-primary theme-text-primary text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition"><i class="fa-solid fa-plus"></i><span>新增圖卡</span></button>
                                <div id="cardsManageList" class="space-y-1.5"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 最底下：使用者。未登入 → 顯示登入（叫出登入頁）；已登入 → 顯示帳號與登出 -->
                <div class="pt-2 space-y-2">
                    <p id="cardsDriveHint" class="text-[10px] text-slate-400 leading-relaxed text-center px-2"></p>
                    <button id="cardsLoginBtn" type="button" data-action="open-login-from-settings" class="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2.5 soft-shadow-sm active:scale-95 transition-all">
                        <i class="fa-brands fa-google text-sm"></i>
                        <span>使用 Google 帳號登入</span>
                    </button>
                    <div id="cardsUserBox" class="hidden space-y-2">
                        <div class="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl px-3 py-2.5">
                            <span id="cardsAvatar" class="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-emerald-600 text-white flex items-center justify-center text-sm font-black"></span>
                            <span class="flex flex-col min-w-0">
                                <span id="cardsUserName" class="text-xs font-black text-emerald-900 dark:text-emerald-200 truncate"></span>
                                <span id="cardsUserEmail" class="text-[10px] font-bold text-emerald-800/80 dark:text-emerald-300/80 truncate"></span>
                            </span>
                        </div>
                        <button type="button" data-action="cards-logout" class="w-full py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>登出帳號</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
`;

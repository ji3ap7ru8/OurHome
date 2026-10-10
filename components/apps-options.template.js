// 應用程式頁的 ︙ 所有應用設定視窗（右側滑出，版型與系統設定相同）。
// 「格式大小」（瀏覽方式/大小/每行數量）；「管理應用」（啟用/停用每個應用）的清單由 apps-options.js 畫在 #manageList；「排序方式」（預設/名稱/自訂編號）與「擴充插件」（貼網址新增）的內容由 apps-options.js 動態畫在 #sortOptions / #pluginBox。
export const appsOptionsTemplate = `
        <div id="appsOptionsPage" class="translate-x-full absolute top-0 bottom-0 right-0 w-[91%] bg-[#fcfbf9] dark:bg-slate-900 rounded-l-[36px] z-50 flex flex-col soft-shadow-lg border-l border-slate-200/60 dark:border-slate-800 transition-transform duration-300 ease-out overflow-hidden">

            <div class="pt-5 pb-3 px-5 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between shrink-0 select-none">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-ellipsis-vertical text-base theme-text-primary"></i>
                    <h1 class="text-base font-black text-slate-800 dark:text-slate-100 tracking-wider">所有應用設定</h1>
                </div>
                <div class="flex items-center gap-2">
                    <button data-tip="apps-gear" data-action="open-settings" data-mode="all" title="系統設定" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300/70 theme-text-primary flex items-center justify-center transition-all active:scale-90">
                        <i class="fa-solid fa-gear text-base"></i>
                    </button>
                                <button data-tip="apps-close" data-action="close-apps-options" title="關閉設定" class="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 hover:bg-rose-100 hover:text-rose-600 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-90">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
                </div>
            </div>

            <div class="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar pb-12">

                <div id="cardFormat" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-tip="apps-format" data-accordion-trigger="format" aria-expanded="false" aria-controls="contentFormat" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-text-height"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">格式大小</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">瀏覽方式、瀏覽大小與每行數量</p>
                            </div>
                        </div>
                        <i id="arrowFormat" class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentFormat" class="acc-body" data-accordion-body="format">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
                                <div id="" class="space-y-2 transition-opacity">
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-table-cells-large text-slate-400 text-sm w-4 text-center"></i>
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">瀏覽方式</span>
                                    </div>
                                    <div class="grid grid-cols-2 gap-2"><button type="button" data-tip="apps-mode-card" data-action="apps-view" data-key="mode" data-value="card" class="py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95">圖卡</button><button type="button" data-tip="apps-mode-list" data-action="apps-view" data-key="mode" data-value="list" class="py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95">清單</button></div>
                                </div>
                                <div id="" class="space-y-2 transition-opacity">
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-up-right-and-down-left-from-center text-slate-400 text-sm w-4 text-center"></i>
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">瀏覽大小</span>
                                    </div>
                                    <div class="grid grid-cols-3 gap-2"><button type="button" data-tip="apps-size-l" data-action="apps-view" data-key="size" data-value="l" class="py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95">大</button><button type="button" data-tip="apps-size-m" data-action="apps-view" data-key="size" data-value="m" class="py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95">中</button><button type="button" data-tip="apps-size-s" data-action="apps-view" data-key="size" data-value="s" class="py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95">小</button></div>
                                </div>
                                <div id="optCols" class="space-y-2 transition-opacity">
                                    <div class="flex items-center gap-3">
                                        <i class="fa-solid fa-table-columns text-slate-400 text-sm w-4 text-center"></i>
                                        <span class="text-xs font-bold text-slate-700 dark:text-slate-200">每行數量（清單模式不適用）</span>
                                    </div>
                                    <div class="grid grid-cols-3 gap-2"><button type="button" data-tip="apps-cols-2" data-action="apps-view" data-key="cols" data-value="2" class="py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95">2 個</button><button type="button" data-tip="apps-cols-3" data-action="apps-view" data-key="cols" data-value="3" class="py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95">3 個</button><button type="button" data-action="apps-view" data-key="cols" data-value="4" class="py-2 rounded-xl text-xs font-bold text-center border transition-all active:scale-95">4 個</button></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="cardManage" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-tip="apps-manage" data-accordion-trigger="manage" aria-expanded="false" aria-controls="contentManage" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-toggle-on"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">管理應用</h3>
                                <p id="manageSummary" class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">啟用或停用每個應用程式</p>
                            </div>
                        </div>
                        <i id="arrowManage" class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentManage" class="acc-body" data-accordion-body="manage">
                        <div class="acc-inner">
                            <div class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                                <p class="text-[10px] text-slate-400 leading-relaxed">預設全部啟用。停用後，該應用不會顯示在「所有應用」，也不能放進系統設定的底部快捷功能。</p>
                                <div id="manageList" class="space-y-1.5"></div>
                                <button id="manageEnableAll" type="button" data-tip="apps-enable-all" data-action="apps-enable-all" class="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-xs font-bold text-center active:scale-95 transition"><i class="fa-solid fa-rotate-left mr-1"></i>全部啟用</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="cardSort" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-tip="apps-sort" data-accordion-trigger="sort" aria-expanded="false" aria-controls="contentSort" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-arrow-down-wide-short"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">排序方式</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">預設、名稱或自訂編號</p>
                            </div>
                        </div>
                        <i id="arrowSort" class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentSort" class="acc-body" data-accordion-body="sort">
                        <div class="acc-inner">
                            <div id="sortOptions" class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3"></div>
                        </div>
                    </div>
                </div>

                <div id="cardPlugins" class="setting-card bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 soft-shadow-sm overflow-hidden transition-all">
                    <button data-tip="apps-plugins" data-accordion-trigger="plugins" aria-expanded="false" aria-controls="contentPlugins" class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl theme-bg-light theme-text-primary flex items-center justify-center text-base font-bold shrink-0">
                                <i class="fa-solid fa-puzzle-piece"></i>
                            </div>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">擴充插件</h3>
                                <p class="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5">填標題與網址，新增或編輯其他服務</p>
                            </div>
                        </div>
                        <i id="arrowPlugins" class="fa-solid fa-chevron-down text-xs text-slate-400 acc-arrow"></i>
                    </button>
                    <div id="contentPlugins" class="acc-body" data-accordion-body="plugins">
                        <div class="acc-inner">
                            <div id="pluginBox" class="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                                <div class="space-y-2">
                                    <p id="pluginEditNote" class="hidden text-[11px] font-bold theme-text-primary theme-bg-light rounded-lg px-3 py-2"></p>
                                    <label for="pluginTitle" data-tip="apps-plug-title" class="text-xs font-bold text-slate-700 dark:text-slate-200 block">標題<span class="text-[10px] font-medium text-slate-400 ml-1">（顯示在所有應用，最多 20 字）</span></label>
                                    <input id="pluginTitle" type="text" maxlength="20" autocomplete="off" enterkeyhint="next" placeholder="例如：家人相簿" class="select-text w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
                                    <label for="pluginUrl" data-tip="apps-plug-url" class="text-xs font-bold text-slate-700 dark:text-slate-200 block pt-1">網址</label>
                                    <input id="pluginUrl" type="url" inputmode="url" enterkeyhint="next" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://example.com" class="select-text w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
                                    <label for="pluginIcon" data-tip="apps-plug-icon" class="text-xs font-bold text-slate-700 dark:text-slate-200 block pt-1">圖示連結<span class="text-[10px] font-medium text-slate-400 ml-1">（選填，https 圖片直接連結）</span></label>
                                    <input id="pluginIcon" type="url" inputmode="url" enterkeyhint="done" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://example.com/icon.png" class="select-text w-full px-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none theme-focus-border">
                                    <div class="flex gap-2">
                                        <button id="pluginSubmit" type="button" data-tip="apps-plug-add" data-action="plugin-add" class="flex-1 py-2.5 rounded-xl theme-bg-primary text-white text-xs font-bold text-center flex items-center justify-center gap-1.5 active:scale-95 transition">
                                            <i id="pluginSubmitIcon" class="fa-solid fa-plus"></i> <span id="pluginSubmitText">新增插件</span>
                                        </button>
                                        <button id="pluginCancel" type="button" data-tip="apps-plug-cancel" data-action="plugin-cancel-edit" class="hidden px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold text-center active:scale-95 transition">取消編輯</button>
                                    </div>
                                </div>
                                <div id="pluginList" class="space-y-2"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 最底下：Google 帳號。未登入 → 顯示登入（叫出登入頁）；已登入 → 顯示帳號與登出 -->
                <div id="appsAccountBox" class="pt-2 space-y-2">
                    <p id="appsDriveHint" class="text-[10px] text-slate-400 leading-relaxed text-center px-2"></p>
                    <button id="appsLoginBtn" type="button" data-tip="apps-login" data-action="open-login-from-settings" class="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-100 font-bold text-xs flex items-center justify-center gap-2.5 soft-shadow-sm active:scale-95 transition-all">
                        <i class="fa-brands fa-google text-sm"></i>
                        <span>使用 Google 帳號登入</span>
                    </button>
                    <div id="appsUserBox" class="hidden space-y-2">
                        <div class="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl px-3 py-2.5">
                            <span id="appsAvatar" class="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-emerald-600 text-white flex items-center justify-center text-sm font-black"></span>
                            <span class="flex flex-col min-w-0">
                                <span id="appsUserName" class="text-xs font-black text-emerald-900 dark:text-emerald-200 truncate"></span>
                                <span id="appsUserEmail" class="text-[10px] font-bold text-emerald-800/80 dark:text-emerald-300/80 truncate"></span>
                            </span>
                        </div>
                        <button type="button" data-tip="apps-logout" data-action="apps-logout" class="w-full py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95">
                            <i class="fa-solid fa-right-from-bracket"></i>
                            <span>登出帳號</span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
`;

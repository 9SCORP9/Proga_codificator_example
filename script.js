class CascadeSelect {
    constructor() {
        this.data = [];
        this.hierarchy = {};
        this.selectIds = ['class', 'subclass', 'group', 'subgroup', 'type', 'category', 'subcategory'];
        this.containers = this.selectIds.map(id => `${id}-container`);
        this.resultButton = document.getElementById('result-button');
        this.resultDisplay = document.getElementById('result-display');
        
        this.init();
    }

    async init() {
        await this.loadCSVData();
        this.buildHierarchy();
        this.setupEventListeners();
        this.autoSelectFirstLevel();
        this.updateResultButton();
    }

    async loadCSVData() {
        try {
            const response = await fetch('ship_class.csv');
            const csvText = await response.text();
            
            const lines = csvText.split('\n').filter(line => line.trim());
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const parts = line.split(';').map(part => part.trim());
                if (parts.length == 2) {
                    const code = parts[0];
                    const name = parts[1];
                    this.data.push({ code, name });
                }
            }
            
            console.log('Загружено записей:', this.data.length);
        } catch (error) {
            console.error('Ошибка загрузки CSV:', error);
        }
    }

    splitCode(code) {
        const parts = [];
        let currentPart = '';
        let inBrackets = false;
        
        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            
            if (char === '(') {
                inBrackets = true;
                currentPart += char;
            } else if (char === ')') {
                inBrackets = false;
                currentPart += char;
            } else if (char === '.' && !inBrackets) {
                if (currentPart) {
                    parts.push(currentPart);
                    currentPart = '';
                }
            } else {
                currentPart += char;
            }
        }
        
        if (currentPart) {
            parts.push(currentPart);
        }
        
        return parts;
    }

    buildHierarchy() {
        this.hierarchy = {};
        
        const sortedData = [...this.data].sort((a, b) => a.code.localeCompare(b.code));
        
        sortedData.forEach(item => {
            const parts = this.splitCode(item.code);
            let currentLevel = this.hierarchy;
            
            let currentCode = '';
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                currentCode = currentCode ? `${currentCode}.${part}` : part;
                
                if (!currentLevel[currentCode]) {
                    currentLevel[currentCode] = {
                        name: this.getNameByCode(currentCode),
                        children: {}
                    };
                }
                
                if (i < parts.length - 1) {
                    currentLevel = currentLevel[currentCode].children;
                }
            }
        });
        
        console.log('Построена иерархия:', this.hierarchy);
    }

    getNameByCode(code) {
        const item = this.data.find(item => item.code === code);
        return item ? item.name : `Неизвестно (${code})`;
    }

    getChildren(parentCode) {
        if (!parentCode) {
            const rootChildren = {};
            Object.keys(this.hierarchy).forEach(code => {
                const parts = this.splitCode(code);
                if (parts.length === 1) {
                    rootChildren[code] = this.hierarchy[code];
                }
            });
            return rootChildren;
        }

        const findChildren = (level, targetCode) => {
            for (const code in level) {
                if (code === targetCode) {
                    return level[code].children;
                }
                const children = findChildren(level[code].children, targetCode);
                if (children) return children;
            }
            return null;
        };

        return findChildren(this.hierarchy, parentCode) || {};
    }

    isLeafElement(code) {
        const children = this.getChildren(code);
        return Object.keys(children).length === 0;
    }

    getParentCode(code) {
        const parts = this.splitCode(code);
        if (parts.length <= 1) return null;
        
        return parts.slice(0, -1).join('.');
    }

    getLevel(code) {
        return this.splitCode(code).length;
    }

    setupEventListeners() {
        this.selectIds.forEach((selectId, index) => {
            const select = document.getElementById(selectId);
            if (select) {
                select.addEventListener('change', () => {
                    if (index < this.selectIds.length - 1) {
                        this.updateNextLevels(index);
                    }
                    this.updateResultButton();
                });
            }
        });

        this.resultButton.addEventListener('click', () => this.showResult());
    }

    autoSelectFirstLevel() {
        const classSelect = document.getElementById('class');
        const rootChildren = this.getChildren(null);
        
        const rootCodes = Object.keys(rootChildren);
        if (rootCodes.length === 1) {
            const rootCode = rootCodes[0];
            this.populateSelect(classSelect, rootChildren, false);
            classSelect.value = rootCode;
            
            this.updateNextLevels(0);
        } else {
            this.populateSelect(classSelect, rootChildren, true);
        }
    }

    updateNextLevels(currentLevelIndex) {
        for (let i = currentLevelIndex + 1; i < this.containers.length; i++) {
            this.hideContainer(this.containers[i]);
            this.clearSelect(this.selectIds[i]);
        }

        if (currentLevelIndex < this.selectIds.length - 1) {
            this.updateLevel(currentLevelIndex + 1);
        }
        
        this.updateResultButton();
    }

    updateLevel(levelIndex) {
        const selectId = this.selectIds[levelIndex];
        const containerId = this.containers[levelIndex];
        const select = document.getElementById(selectId);
        const container = document.getElementById(containerId);

        const parentCodes = [];
        for (let i = 0; i < levelIndex; i++) {
            const parentSelect = document.getElementById(this.selectIds[i]);
            if (parentSelect && parentSelect.value) {
                parentCodes.push(parentSelect.value);
            }
        }

        const parentCode = parentCodes[parentCodes.length - 1];
        const children = this.getChildren(parentCode);

        if (Object.keys(children).length > 0) {
            this.populateSelect(select, children, true);
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }

    populateSelect(selectElement, data, includeDefaultOption = true) {
        this.clearSelect(selectElement);
        
        if (includeDefaultOption) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- Выберите --';
            selectElement.appendChild(defaultOption);
        }

        const sortedCodes = Object.keys(data).sort((a, b) => a.localeCompare(b));
        
        sortedCodes.forEach(code => {
            const item = data[code];
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${code} - ${item.name}`;
            option.className = `level-${this.getLevel(code)}`;
            selectElement.appendChild(option);
        });
    }

    clearSelect(selectId) {
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
            selectElement.innerHTML = '';
        }
    }

    hideContainer(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.add('hidden');
        }
    }

    updateResultButton() {
        let selectedLeafElement = null;
        
        for (let i = this.selectIds.length - 1; i >= 0; i--) {
            const select = document.getElementById(this.selectIds[i]);
            if (select && select.value !== '') {
                if (this.isLeafElement(select.value)) {
                    selectedLeafElement = select.value;
                    break;
                }
            }
        }
        
        this.resultButton.disabled = !selectedLeafElement;
    }

    showResult() {
        let selectedCode = '';
        let selectedName = '';
        
        for (let i = this.selectIds.length - 1; i >= 0; i--) {
            const select = document.getElementById(this.selectIds[i]);
            if (select && select.value !== '') {
                selectedCode = select.value;
                selectedName = select.options[select.selectedIndex].text;
                break;
            }
        }
        
        if (selectedCode) {
            const nameWithoutCode = selectedName.split(' - ')[1] || selectedName;
            this.resultDisplay.textContent = `Выбранный код: ${selectedCode}`;
            this.resultDisplay.classList.remove('hidden');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new CascadeSelect();
});
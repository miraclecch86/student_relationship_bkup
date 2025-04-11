// 전역 변수
let classes = [];
let editingClassId = null;

// DOM이 로드되면 데이터를 불러오고 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // 학급 저장 버튼
    document.getElementById('saveClass').addEventListener('click', () => {
        const nameInput = document.getElementById('className');
        const descInput = document.getElementById('classDescription');
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        
        if (name) {
            if (editingClassId) {
                updateClass(editingClassId, name, description);
            } else {
                addClass(name, description);
            }
            closeModal();
        }
    });
    
    // 검색 기능
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredClasses = classes.filter(c => 
            c.name.toLowerCase().includes(searchTerm) ||
            c.description.toLowerCase().includes(searchTerm)
        );
        updateClassList(filteredClasses);
    });
});

// 데이터 로드
async function loadData() {
    try {
        const response = await fetch('/api/classes');
        classes = await response.json();
        updateClassList(classes);
    } catch (error) {
        console.error('데이터 로드 중 오류 발생:', error);
    }
}

// 학급 목록 업데이트
function updateClassList(classesToShow) {
    const container = document.querySelector('.class-list');
    container.innerHTML = '';
    
    if (classesToShow.length === 0) {
        container.innerHTML = '<div class="no-data">등록된 학급이 없습니다.</div>';
        return;
    }
    
    classesToShow.forEach(class_ => {
        const card = document.createElement('div');
        card.className = 'class-card fade-in';
        card.onclick = () => window.location.href = `/relationships/${class_.id}`;
        
        const header = document.createElement('div');
        header.className = 'class-header';
        
        const title = document.createElement('h3');
        title.textContent = class_.name;
        
        const studentCount = document.createElement('span');
        studentCount.className = 'student-count';
        studentCount.textContent = `학생 ${class_.student_count}명`;
        
        header.appendChild(title);
        header.appendChild(studentCount);
        
        const description = document.createElement('p');
        description.className = 'class-description';
        description.textContent = class_.description || '설명이 없습니다.';
        
        const actions = document.createElement('div');
        actions.className = 'class-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-warning btn-sm';
        editBtn.textContent = '수정';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            showEditModal(class_);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.textContent = '삭제';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteClass(class_.id);
        };
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        
        card.appendChild(header);
        card.appendChild(description);
        card.appendChild(actions);
        container.appendChild(card);
    });
}

// 학급 추가 모달 표시
function showAddModal() {
    editingClassId = null;
    const modal = document.getElementById('classModal');
    const titleElement = modal.querySelector('#modalTitle');
    const nameInput = modal.querySelector('#className');
    const descInput = modal.querySelector('#classDescription');
    
    titleElement.textContent = '학급 추가';
    nameInput.value = '';
    descInput.value = '';
    modal.classList.add('show');
    nameInput.focus();
}

// 학급 수정 모달 표시
function showEditModal(class_) {
    editingClassId = class_.id;
    const modal = document.getElementById('classModal');
    const titleElement = modal.querySelector('#modalTitle');
    const nameInput = modal.querySelector('#className');
    const descInput = modal.querySelector('#classDescription');
    
    titleElement.textContent = '학급 수정';
    nameInput.value = class_.name;
    descInput.value = class_.description || '';
    modal.classList.add('show');
    nameInput.focus();
}

// 모달 닫기
function closeModal() {
    const modal = document.getElementById('classModal');
    modal.classList.remove('show');
}

// 학급 추가
async function addClass(name, description) {
    try {
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description })
        });
        
        if (response.ok) {
            const newClass = await response.json();
            classes.push(newClass);
            updateClassList(classes);
        }
    } catch (error) {
        console.error('학급 추가 중 오류 발생:', error);
    }
}

// 학급 수정
async function updateClass(classId, name, description) {
    try {
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description })
        });
        
        if (response.ok) {
            const updatedClass = await response.json();
            const index = classes.findIndex(c => c.id === classId);
            if (index !== -1) {
                classes[index] = updatedClass;
                updateClassList(classes);
            }
        }
    } catch (error) {
        console.error('학급 수정 중 오류 발생:', error);
    }
}

// 학급 삭제
async function deleteClass(classId) {
    if (!confirm('정말 삭제하시겠습니까?\n학급에 속한 학생들은 미배정 상태가 됩니다.')) return;
    
    try {
        const response = await fetch(`/api/classes/${classId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            classes = classes.filter(c => c.id !== classId);
            updateClassList(classes);
        }
    } catch (error) {
        console.error('학급 삭제 중 오류 발생:', error);
    }
} 
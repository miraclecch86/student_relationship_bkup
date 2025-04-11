// 전역 변수
let students = [];
let relationships = [];
let nodePositions = {};

// DOM이 로드되면 데이터를 불러오고 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

// 데이터 로드
async function loadData() {
    try {
        // 학생 데이터 로드
        const studentsResponse = await fetch('/api/students');
        students = await studentsResponse.json();

        // 관계 데이터 로드
        const relationshipsResponse = await fetch('/api/relationships');
        relationships = await relationshipsResponse.json();
        
        // UI 업데이트
        updateStudentList();
        updateRelationshipMap();
    } catch (error) {
        console.error('데이터 로드 중 오류 발생:', error);
    }
}

// 학생 목록 업데이트
function updateStudentList() {
    const container = document.getElementById('studentList');
    container.innerHTML = '';
    
    students.forEach(student => {
        const div = document.createElement('div');
        div.className = 'student-item fade-in';
        div.onclick = () => window.location.href = `/student/${student.id}`;
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = student.name;
        
        const actions = document.createElement('div');
        actions.className = 'student-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = '수정';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            showEditModal(student);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '삭제';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`${student.name} 학생을 삭제하시겠습니까?`)) {
                deleteStudent(student.id);
            }
        };
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        div.appendChild(nameSpan);
        div.appendChild(actions);
        container.appendChild(div);
    });
}

// 관계도 맵 업데이트
function updateRelationshipMap() {
    const container = d3.select('#relationship-map-container');
    container.selectAll('*').remove();

    if (students.length === 0) return;

    const width = container.node().getBoundingClientRect().width;
    const height = container.node().getBoundingClientRect().height;

    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // 화살표 마커 정의
    const colors = {
        '친해': '#10b981',
        '보통': '#f59e0b',
        '안친해': '#ef4444'
    };

    Object.entries(colors).forEach(([type, color]) => {
        svg.append('defs').append('marker')
            .attr('id', `arrow-${type}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .style('fill', color);
    });

    // 노드 위치 계산
    const nodes = students.map(student => ({
        id: student.id,
        name: student.name,
        x: nodePositions[student.id]?.x || width/2 + (Math.random() - 0.5) * width/2,
        y: nodePositions[student.id]?.y || height/2 + (Math.random() - 0.5) * height/2
    }));

    // 링크 데이터 생성
    const links = relationships.map(rel => ({
        source: nodes.find(n => n.id === rel.student_id),
        target: nodes.find(n => n.id === rel.friend_id),
        type: rel.relationship_type
    }));
    
    // 링크 그리기
    const link = svg.selectAll('.link')
        .data(links)
        .enter()
        .append('path')
        .attr('class', 'link')
        .style('stroke', d => colors[d.type])
        .style('stroke-width', 2)
        .style('fill', 'none')
        .attr('marker-end', d => `url(#arrow-${d.type})`);
    
    // 노드 그리기
    const node = svg.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .style('cursor', 'pointer')
        .on('click', (event, d) => window.location.href = `/student/${d.id}`)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));
    
    node.append('circle')
        .attr('r', 20)
        .style('fill', '#fff')
        .style('stroke', '#6366f1')
        .style('stroke-width', 2);
    
    node.append('text')
        .attr('dy', '.35em')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .text(d => d.name);
    
    // 시뮬레이션 설정
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).distance(150))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40))
        .on('tick', ticked);

    // 시뮬레이션 업데이트 함수
    function ticked() {
        link.attr('d', d => {
            const dx = d.target.x - d.source.x;
            const dy = d.target.y - d.source.y;
            const dr = Math.sqrt(dx * dx + dy * dy);
            return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        });
        
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    }
    
    // 드래그 이벤트 핸들러
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;

        // 노드 위치 저장
        nodePositions[event.subject.id] = {
            x: event.subject.x,
            y: event.subject.y
        };
    }
}

// 모달 관련 함수들
function showEditModal(student) {
    const modal = document.getElementById('editModal');
    const input = document.getElementById('editStudentName');
    input.value = student.name;
    input.dataset.studentId = student.id;
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('active');
}

// 학생 관리 함수들
async function addStudent() {
    const input = document.getElementById('studentName');
    const name = input.value.trim();
    
    if (!name) {
        alert('학생 이름을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch('/api/students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            const student = await response.json();
            students.push(student);
            updateStudentList();
            updateRelationshipMap();
            input.value = '';
        }
    } catch (error) {
        console.error('학생 추가 중 오류 발생:', error);
        alert('학생을 추가하는 중 오류가 발생했습니다.');
    }
}

async function saveEdit() {
    const input = document.getElementById('editStudentName');
    const name = input.value.trim();
    const studentId = parseInt(input.dataset.studentId);
    
    if (!name) {
        alert('학생 이름을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch(`/api/students/${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
        
        if (response.ok) {
            const updatedStudent = await response.json();
            const index = students.findIndex(s => s.id === studentId);
            if (index !== -1) {
                students[index] = updatedStudent;
                updateStudentList();
                updateRelationshipMap();
                closeModal();
            }
        }
    } catch (error) {
        console.error('학생 정보 수정 중 오류 발생:', error);
        alert('학생 정보를 수정하는 중 오류가 발생했습니다.');
    }
}

async function deleteStudent(studentId) {
    try {
        const response = await fetch(`/api/students/${studentId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            students = students.filter(s => s.id !== studentId);
            relationships = relationships.filter(r => 
                r.student_id !== studentId && r.friend_id !== studentId
            );
            updateStudentList();
            updateRelationshipMap();
        }
    } catch (error) {
        console.error('학생 삭제 중 오류 발생:', error);
        alert('학생을 삭제하는 중 오류가 발생했습니다.');
    }
}

// 관계 필터링
function filterRelationships(type) {
    const buttons = document.querySelectorAll('.filter-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (type === 'all') {
        updateRelationshipMap();
        return;
    }
    
    const filteredRelationships = relationships.filter(r => r.relationship_type === type);
    relationships = filteredRelationships;
    updateRelationshipMap();
    relationships = originalRelationships;
} 
} 
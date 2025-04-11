// 전역 변수
let relationships = {};

// DOM이 로드되면 데이터를 불러오고 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

// 데이터 로드
async function loadData() {
    try {
        const response = await fetch('/api/relationships');
        const data = await response.json();
        
        // 현재 학생의 관계 데이터 필터링
        const currentStudentId = parseInt(window.location.pathname.split('/').pop());
        relationships = data.filter(rel => 
            rel.student_id === currentStudentId || rel.friend_id === currentStudentId
        );
        
        // 관계 버튼 상태 업데이트
        updateRelationshipButtons();
    } catch (error) {
        console.error('데이터 로드 중 오류 발생:', error);
        showAlert('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 관계 업데이트
async function updateRelationship(friendId, type) {
    const currentStudentId = parseInt(window.location.pathname.split('/').pop());
    
    try {
        const response = await fetch('/api/relationships', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_id: currentStudentId,
                friend_id: friendId,
                relationship_type: type
            })
        });
        
        if (response.ok) {
            if (response.status === 204) {
                // 관계가 삭제됨
                relationships = relationships.filter(rel => 
                    !(rel.student_id === currentStudentId && rel.friend_id === friendId) &&
                    !(rel.student_id === friendId && rel.friend_id === currentStudentId)
                );
            } else {
                const newRelationship = await response.json();
                // 기존 관계 업데이트 또는 새로운 관계 추가
                const index = relationships.findIndex(rel => 
                    (rel.student_id === currentStudentId && rel.friend_id === friendId) ||
                    (rel.student_id === friendId && rel.friend_id === currentStudentId)
                );
                if (index !== -1) {
                    relationships[index] = newRelationship;
                } else {
                    relationships.push(newRelationship);
                }
            }
            
            updateRelationshipButtons();
            showAlert('관계가 업데이트되었습니다.', 'success');
        }
    } catch (error) {
        console.error('관계 업데이트 중 오류 발생:', error);
        showAlert('관계를 업데이트하는 중 오류가 발생했습니다.', 'error');
    }
}

// 관계 버튼 상태 업데이트
function updateRelationshipButtons() {
    const currentStudentId = parseInt(window.location.pathname.split('/').pop());
    const items = document.querySelectorAll('.relationship-item');
    
    items.forEach(item => {
        const buttons = item.querySelectorAll('.relationship-button');
        const friendId = parseInt(item.querySelector('.relationship-buttons').dataset.friendId);
        
        // 현재 관계 찾기
        const relationship = relationships.find(rel => 
            (rel.student_id === currentStudentId && rel.friend_id === friendId) ||
            (rel.student_id === friendId && rel.friend_id === currentStudentId)
        );
        
        // 모든 버튼의 active 클래스 제거
        buttons.forEach(btn => btn.classList.remove('active'));
        
        // 현재 관계에 해당하는 버튼에 active 클래스 추가
        if (relationship) {
            const activeButton = item.querySelector(`[data-type="${relationship.relationship_type}"]`);
            if (activeButton) {
                activeButton.classList.add('active');
            }
        }
    });
}

// 주간 메모 저장
async function saveWeeklyMemo() {
    const currentStudentId = parseInt(window.location.pathname.split('/').pop());
    const memo = document.getElementById('weeklyMemo').value;
    
    try {
        const response = await fetch(`/api/students/${currentStudentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                weekly_memo: memo
            })
        });
        
        if (response.ok) {
            showAlert('메모가 저장되었습니다.', 'success');
        }
    } catch (error) {
        console.error('메모 저장 중 오류 발생:', error);
        showAlert('메모를 저장하는 중 오류가 발생했습니다.', 'error');
    }
}

// 알림 메시지 표시
function showAlert(message, type) {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.className = `alert alert-${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
} 
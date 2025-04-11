from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import os
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///students.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 기본 에러 응답 생성
def create_error_response(message, code=400):
    return jsonify({'error': message}), code

# 학급 모델
class Class(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    students = db.relationship('Student', backref='class_', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'student_count': len(self.students)
        }

# 학생 모델
class Student(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    class_id = db.Column(db.Integer, db.ForeignKey('class.id'), nullable=False)
    weekly_form_json = db.Column(db.Text, nullable=True)  # 주간식 데이터를 JSON 문자열로 저장
    
    # 관계 정의
    sent_relationships = db.relationship('Relationship',
        foreign_keys='[Relationship.student_id]',
        backref=db.backref('student', lazy=True),
        lazy='dynamic',
        cascade='all, delete-orphan')
    received_relationships = db.relationship('Relationship',
        foreign_keys='[Relationship.friend_id]',
        backref=db.backref('friend', lazy=True),
        lazy='dynamic',
        cascade='all, delete-orphan')

    def to_dict(self, include_weekly_form=False):
        data = {
            'id': self.id,
            'name': self.name,
            'class_id': self.class_id
        }
        if include_weekly_form:
            # weekly_form_json 필드에서 데이터 가져오기
            weekly_form = {}
            if self.weekly_form_json:
                try:
                    weekly_form = json.loads(self.weekly_form_json)
                except:
                    print(f"Error decoding JSON for student {self.id}")
            data['weekly_form'] = weekly_form
        return data

# 관계 모델
class Relationship(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    friend_id = db.Column(db.Integer, db.ForeignKey('student.id'), nullable=False)
    relationship_type = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'friend_id': self.friend_id,
            'relationship_type': self.relationship_type
        }

# 페이지 라우트
@app.route('/')
def index():
    return render_template('classes.html')

@app.route('/classes')
def classes():
    return render_template('classes.html')

@app.route('/relationships/<int:class_id>')
def relationships(class_id):
    class_ = Class.query.get_or_404(class_id)
    return render_template('index.html', class_=class_)

@app.route('/relationships/<int:class_id>/student/<int:student_id>')
def student_relationships(class_id, student_id):
    try:
        # 학생 정보 조회
        student = Student.query.get_or_404(student_id)
        if student.class_id != class_id:
            return create_error_response('해당 학급의 학생이 아닙니다.', 404)
            
        # 클래스 정보 조회
        class_ = Class.query.get_or_404(class_id)
        
        # 같은 반 다른 학생들 조회
        other_students = Student.query.filter(
            Student.class_id == class_id,
            Student.id != student_id
        ).all()
        
        # 현재 학생의 관계 정보 조회
        relationships = Relationship.query.filter(
            (Relationship.student_id == student_id) | 
            (Relationship.friend_id == student_id)
        ).all()
        
        # SQLAlchemy 객체를 dict로 변환
        student_dict = student.to_dict()
        other_students_dict = [s.to_dict() for s in other_students]
        relationships_dict = [r.to_dict() for r in relationships]
        
        return render_template('student.html',
            student=student_dict,
            class_=class_.to_dict(),
            other_students=other_students_dict,
            relationships=relationships_dict
        )
    except Exception as e:
        print(f"Error in student_relationships: {str(e)}")
        return create_error_response(str(e), 500)

@app.route('/student/<int:student_id>')
def student_detail(student_id):
    try:
        # 학생 정보 조회
        student = Student.query.get(student_id)
        if not student:
            return create_error_response('학생을 찾을 수 없습니다.', 404)
            
        # 클래스 정보 조회
        class_ = Class.query.get(student.class_id)
        if not class_:
            return create_error_response('학급을 찾을 수 없습니다.', 404)
        
        # 해당 학생의 관계 정보 조회
        relationships = Relationship.query.filter(
            (Relationship.student_id == student_id) | 
            (Relationship.friend_id == student_id)
        ).all()
        
        # 클래스의 다른 학생들 조회
        other_students = Student.query.filter(
            Student.class_id == class_.id,
            Student.id != student_id
        ).all()
        
        return render_template('student.html',
            student=student,
            class_=class_,
            relationships=relationships,
            other_students=other_students
        )
    except Exception as e:
        print(f"Error in student_detail: {str(e)}")  # 디버깅용 로그
        return create_error_response(str(e), 500)

# API 엔드포인트 - 클래스
@app.route('/api/classes', methods=['GET'])
def get_classes():
    classes = Class.query.all()
    return jsonify([class_.to_dict() for class_ in classes])

@app.route('/api/classes', methods=['POST'])
def add_class():
    data = request.get_json()
    if not data or 'name' not in data:
        return create_error_response('클래스 이름이 필요합니다.')
    
    try:
        new_class = Class(
            name=data['name'],
            description=data.get('description', '')
        )
        db.session.add(new_class)
        db.session.commit()
        return jsonify(new_class.to_dict())
    except Exception as e:
        db.session.rollback()
        return create_error_response(str(e), 500)

@app.route('/api/classes/<int:class_id>', methods=['GET'])
def get_class(class_id):
    class_ = Class.query.get_or_404(class_id)
    return jsonify(class_.to_dict())

@app.route('/api/classes/<int:class_id>', methods=['PUT'])
def update_class(class_id):
    class_ = Class.query.get_or_404(class_id)
    data = request.get_json()
    
    if not data:
        return create_error_response('데이터가 필요합니다.')
    
    try:
        if 'name' in data:
            class_.name = data['name']
        if 'description' in data:
            class_.description = data['description']
        db.session.commit()
        return jsonify(class_.to_dict())
    except Exception as e:
        db.session.rollback()
        return create_error_response(str(e), 500)

@app.route('/api/classes/<int:class_id>', methods=['DELETE'])
def delete_class(class_id):
    class_ = Class.query.get_or_404(class_id)
    try:
        db.session.delete(class_)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return create_error_response(str(e), 500)

# API 엔드포인트 - 학생
@app.route('/api/classes/<int:class_id>/students', methods=['GET'])
def get_class_students(class_id):
    students = Student.query.filter_by(class_id=class_id).all()
    return jsonify([student.to_dict() for student in students])

@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.get_json()
    if not data or 'name' not in data or 'class_id' not in data:
        return create_error_response('이름과 클래스 ID가 필요합니다.')
    
    try:
        new_student = Student(
            name=data['name'],
            class_id=data['class_id']
        )
        db.session.add(new_student)
        db.session.commit()
        return jsonify(new_student.to_dict())
    except Exception as e:
        db.session.rollback()
        return create_error_response(str(e), 500)

@app.route('/api/students/<int:student_id>', methods=['GET'])
def get_student(student_id):
    student = Student.query.get_or_404(student_id)
    return jsonify(student.to_dict(include_weekly_form=True))

@app.route('/api/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    student = Student.query.get_or_404(student_id)
    data = request.get_json()
    
    if not data:
        return create_error_response('데이터가 필요합니다.')
    
    try:
        if 'name' in data:
            student.name = data['name']
        db.session.commit()
        return jsonify(student.to_dict())
    except Exception as e:
        db.session.rollback()
        return create_error_response(str(e), 500)

@app.route('/api/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    student = Student.query.get_or_404(student_id)
    try:
        db.session.delete(student)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return create_error_response(str(e), 500)

# API 엔드포인트 - 주간식
@app.route('/api/students/<int:student_id>/weekly-form', methods=['GET'])
def get_weekly_form(student_id):
    student = Student.query.get_or_404(student_id)
    weekly_form_data = {}
    
    # weekly_form_json에서 데이터 가져오기
    if student.weekly_form_json:
        try:
            weekly_form_data = json.loads(student.weekly_form_json)
        except:
            print(f"Error decoding JSON for student {student_id}")
    
    return jsonify(weekly_form_data)

@app.route('/api/students/<int:student_id>/weekly-form', methods=['PUT'])
def update_weekly_form(student_id):
    student = Student.query.get_or_404(student_id)
    data = request.get_json()
    
    if not data:
        return create_error_response('데이터가 필요합니다.')
    
    try:
        # 기존 데이터 가져오기 (저장된 것이 없으면 빈 딕셔너리)
        weekly_form_data = {}
        if student.weekly_form_json:
            try:
                weekly_form_data = json.loads(student.weekly_form_json)
            except:
                weekly_form_data = {}
        
        # 요청 데이터로 업데이트
        for key, value in data.items():
            if key.startswith('additional_question_'):
                weekly_form_data[key] = value
        
        # JSON 문자열로 변환하여 저장
        student.weekly_form_json = json.dumps(weekly_form_data)
        db.session.commit()
        
        # 업데이트된 데이터 반환
        return jsonify(weekly_form_data)
    except Exception as e:
        db.session.rollback()
        print(f"Error in update_weekly_form: {str(e)}")  # 서버 로그에 에러 출력
        return create_error_response(str(e), 500)

# API 엔드포인트 - 관계
@app.route('/api/classes/<int:class_id>/relationships', methods=['GET'])
def get_class_relationships(class_id):
    relationships = Relationship.query.join(Student, 
        (Relationship.student_id == Student.id) | (Relationship.friend_id == Student.id)
    ).filter(Student.class_id == class_id).all()
    return jsonify([rel.to_dict() for rel in relationships])

@app.route('/api/relationships', methods=['POST'])
def add_or_update_relationship():
    data = request.get_json()
    if not data or 'student_id' not in data or 'friend_id' not in data or 'relationship_type' not in data:
        return create_error_response('학생 ID, 친구 ID, 관계 유형이 필요합니다.')
    
    try:
        # 기존 관계 확인
        relationship = Relationship.query.filter_by(
            student_id=data['student_id'],
            friend_id=data['friend_id']
        ).first()
        
        if relationship:
            # 기존 관계 업데이트
            relationship.relationship_type = data['relationship_type']
        else:
            # 새 관계 생성
            relationship = Relationship(
                student_id=data['student_id'],
                friend_id=data['friend_id'],
                relationship_type=data['relationship_type']
            )
            db.session.add(relationship)
        
        db.session.commit()
        return jsonify(relationship.to_dict())
    except Exception as e:
        db.session.rollback()
        return create_error_response(str(e), 500)

@app.route('/api/classes/<int:class_id>/reset', methods=['POST'])
def reset_class_students(class_id):
    try:
        # 해당 클래스의 모든 학생 조회
        students = Student.query.filter_by(class_id=class_id).all()
        
        # 각 학생의 관계 정보와 학생 정보 삭제
        for student in students:
            # 기존 관계 삭제
            Relationship.query.filter(
                (Relationship.student_id == student.id) |
                (Relationship.friend_id == student.id)
            ).delete()
            
            # 학생 삭제
            db.session.delete(student)
        
        db.session.commit()
        return jsonify({'message': '모든 학생 정보가 초기화되었습니다.'})
        
    except Exception as e:
        db.session.rollback()
        print(f"Error in reset_class_students: {str(e)}")
        return create_error_response(str(e), 500)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True) 
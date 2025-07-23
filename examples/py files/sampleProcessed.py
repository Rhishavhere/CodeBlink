print("welcome to area calculator")
choice = input("Rectangle(1) or square(2) ? ")

if choice == '1':
    length = int(input("length: "))
    breadth = int(input("breadth: "))
    area = length * breadth
    print("the area is", area)
elif choice == '2':
    side = int(input("side: "))
    area = side * side
    print("the area is", area)
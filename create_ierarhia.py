
parent_code = "361(30.1)" 
parent_name = "класс"
cld = {}
cld[1] = "подкласс"
cld[2] = "группа"
cld[3] = "подгруппа"
cld[4] = "вид"
cld[5] = "категория"
cld[6] = "подкатегория"

all_list = [[parent_code, parent_name]]

def create_child(parent_name, parent_code, type, tabs):
    print(f"{tabs}{parent_code}: {parent_name}")
    
    count = int(input(f"{tabs}count: "))
    for i in range(count):
        code = f"{parent_code}.0{i+1}"
        name = f"{cld[type]}_{i+1}"
        all_list.append([code, name])
        if type <6:
            create_child(name, code, type+1, f"{tabs}\t")
    if count>0:
        all_list.append([f"{parent_code}.99", "Прочие"])

print("==================")

create_child(parent_name, parent_code, 1, "")

for code, name in all_list:
    print(f"{code}\t{name}")
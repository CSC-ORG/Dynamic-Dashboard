import pandas as pd
import requests
import numpy as np
import xlrd
import csv
import redis
import json
import operator

def get_spreadsheet(key):
	fileobj_csv = requests.get('https://docs.google.com/spreadsheet/ccc?key='+key+'&output=csv').text
	return fileobj_csv
def find_dataset(identifier,datasetid):
	dataset = None
	dataObj = json_loads_redis(identifier)
	for item in dataObj['datasets']:
		if item['_id'] == datasetid:
			dataset = item['filters']
			break
	return dataset
def store_in_redis(Identifier,strobj):
	conn = redis.Redis()
	conn.set(Identifier,strobj)

def json_loads_redis(identifier):
	conn = redis.Redis()
	strobj = conn.get(identifier)
	return json.loads(strobj)

def ret_sheetnames(fileobj):
	wb = xlrd.open_workbook(file_contents = fileobj.read())
	return {'sheet_names':wb.sheet_names()}

class Filters:
	@classmethod
	def limit(self,df,limit):
		limit = len(df) if limit >len(df) else limit
		return df.head(limit)
	@classmethod
	def limit_obj(self,df,lim,identifier,skip):
		skip = 0 if skip == None else skip
		lim = len(df)-skip if len(df)<(skip+lim) else lim
		return ObjFile.obj(df,identifier,lim,skip)
	@classmethod
	def range(self,df,fro,to):
		return df[fro:to]
	@classmethod
	def sort_col(self,df,column,sort):
		try:
			isAsc = True if sort == 1 else False
			return df.sort_index(by = column, ascending = isAsc)
		except:
			return df
	@classmethod
	def obj_where(self,df,column,values):
		try:
			return df.ix[[item in values for item in df[column]]]
		except:
			return df
	@classmethod
	def groupby(self,df,colgroup,colagr,agr):
		try:
			if agr == 'count':
				return df.groupby(colgroup)[colagr].count() 
			elif agr == 'sum':
				return df.groupby(colgroup)[colagr].sum()
			elif agr == 'mean':
				return df.groupby(colgroup)[colagr].mean()
			elif agr == 'max':
				return df.groupby(colgroup)[colagr].max()
			elif agr == 'min':
				return df.groupby(colgroup)[colagr].min()
			else:
				return df
		except:
			return df

class DataView():
	@classmethod
	def return_df(self,identifier):
		data = json_loads_redis(identifier)['data']
		return pd.DataFrame(data)
	@classmethod
	def filter_view(self,identifier,limit=None,skip=None,filters=None):
		df = self.return_df(identifier)
		if(filters!=None):
			filters = sorted(filters,key=operator.itemgetter('priority'))
			for item in filters:
				if (item['select'] != ''):
					df = Filters.obj_where(df,item['column'],item['select'])
				if (item['aggregate']!=''):
					df = Filter.groupby(df,colgroup,colagr,agr)
				if (item['sort'] != ''):
					df = Filters.sort_col(df,item['column'],int(item['sort']))
				if (item['limit']!=''):
					df = Filters.limit(df,int(item['limit']))
				
		limit = len(df) if limit == None else limit
		return Filters.limit_obj(df,limit,identifier,skip)
	@classmethod
	def chart_view(self,identifier,datasetid):
		dataset = find_dataset(identifier,datasetid)
		df = self.return_df(identifier)
		return self.filter_view(identifier,filters = dataset)

class ObjFile():
	@classmethod
	def putString(self,obj):
		obj = json.dumps(obj)
		return str(obj)
	@classmethod
	def obj(self,df,identifier,limit,skip):
		dataObj = {'data':{},
		 'columns':None,
		 'unique':{},
		 'types':None,
		 'identifier':None,
		 'numrow':0
		}
		dataObj['identifier'] =identifier
		dataObj['columns'] = df.columns.tolist()
		dataObj['types'] = []
		dataObj['numrow'] = len(df)
		for column in df.columns:
			dataObj['data'][column] = df[column].values.tolist()[skip:skip+limit]
			try:
				dataObj['types'].append(str(type(df[column].values[0])))
			except:
				dataObj['types']=None
			dataObj['unique'][column] = df[column].dropna().unique().tolist()
		return  dataObj

class Response():
	message = {
			'status':None,
			'error_message':None
			}

	@classmethod
	def success(self):
		self.message['status'] = 200
		self.message['error_message'] = None
		return self.message
	@classmethod
	def invalid_head(self):
		self.message['status'] = 500
		self.message['error_message'] = 'Header should be unique and cannot be null'
		return self.message
	@classmethod
	def	non_unique_dt(self,cols):
		self.message['status'] = 500
		error_cols = ",".join(cols)
		self.message['error_message'] = 'non unique datatypes in columns '+ error_cols
		return self.message
	@classmethod
	def file_not_sup(self):
		self.message['status'] = 500
		self.message['error_message'] = 'file not supported or corrupted'
		return self.message
	@classmethod
	def unsup_spreadsheet(self):
		self.message['status'] = 500
		self.message['error_message'] = 'spreadsheet not opening'
		return self.message


class Validator():
	@classmethod
	def validate_header(self,fileobj,filetype,sheetno):
		is_valid_head = True
		values = []
		if(filetype == 'xls') or (filetype == 'xlsx'):
			wb = xlrd.open_workbook(file_contents = fileobj.read())
			sheet = wb.sheet_by_index(sheetno)
			for i in range(0,sheet.ncols):
				cell = sheet.cell(0,i)
				if(cell.ctype == xlrd.XL_CELL_EMPTY):
					is_valid_head = False
					break
				else:
					if cell.value not in values:
						value = re.sub(r'[.]','_',cell.value)
						values.append(value)
					else:
						is_valid_head = False
						break
		elif filetype == 'csv':
			reader = csv.reader(fileobj)
			header = reader.next()
			for head in header:
				if head == '':
					is_valid_head = False
					break
				else:
					if head not in values:
						value = re.sub(r'[.]','_',head)
						values.append(value)
					else:
						is_valid_head = False
						break

		return is_valid_head

	@classmethod
	def check_unique(self,col_series):
		is_unique = True
		if len(col_series) > 1:
			col_type = type(col_series.values[0])
			col_series = col_series[1:]
			for item in col_series.values:
				if type(item)!= col_type:
					is_unique = False
					break;
		return is_unique
	
	@classmethod
	def valid_xl_csv(self,filetype,fileobj,Identifier,sheetno):
		res_message = {} 
		non_unique_columns = []
		try:
			if(self.validate_header(fileobj,filetype,sheetno)):
				fileobj.seek(0)
				if (filetype == 'xls')|(filetype == 'xlsx'):
					df = pd.read_excel(fileobj,sheetname=sheetno)
				elif filetype == 'csv':
					df = pd.read_csv(fileobj)
				for item in df.columns:
					series = df[item].dropna()
					is_unique = self.check_unique(series)
					if is_unique == False:
						non_unique_columns.append(item)
				if(non_unique_columns):
					res_message = Response.non_unique_dt(non_unique_columns)
				else:
					res_message = Response.success()
					dataobject = ObjFile.obj(df,Identifier,len(df),0)
					store_in_redis(Identifier,ObjFile.putString(dataobject))

			else:
				res_message = Response.invalid_head()
		except:
			res_message = Response.file_not_sup()
		return res_message

	@classmethod
	def valid_spreadsheet(self,key):
		try:
			fileobj_csv = get_spreadsheet(key)
			return self.valid_xl_csv('csv',fileobj_csv,key)
		except:
			return Response.unsup_spreadsheet()
		
	@classmethod
	def validate(self,Identifier,types,sheetno,fileobj=None,formats=None):
		if types == 'link':
			return self.valid_spreadsheet(Identifier)
		if types == 'file':
			return self.valid_xl_csv(formats,fileobj,Identifier,sheetno)
'''f=open('testfile/8.csv','rb')
a=Validator.validate('123','file',f,'xls')
print a'''
'''a={
	'identifier':'123',
	'limit':10,
	'skip':0,
	'filters':[
                {
                    "limit" : "10",
                    "sort" : "1",
                    "select" : [ 
                        "ANDHRA PRADESH", 
                        "ARUNACHAL PRADESH", 
                        "LAKSHADWEEP", 
                        "PUDUCHERRY"
                    ],
                    "column" : "STATE",
                    "priority" : 1,
                    "aggregate":{'colagr':'','agr':''}
                }
            ]
}
print DataView.filter_view(a['identifier'],a['limit'],a['skip'])'''
'''print DataView.chart_view('123','550665e2f94139fc049a8ccd')'''